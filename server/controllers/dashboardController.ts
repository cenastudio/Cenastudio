/**
 * Dashboard Controller
 *
 * Handles dashboard data aggregation and statistics.
 * Provides endpoints for:
 * - /api/dashboard/stats - Workflow statistics
 */

import type { Request, Response } from 'express';
import { prisma, shouldUsePrisma } from '../models/prisma.js';
import { db } from '../models/db.js';
import { jsonSafe } from '../utils/prismaSerialization.js';

/**
 * GET /api/dashboard/stats
 *
 * Returns workflow statistics for the authenticated user:
 * - activeJobs: Number of active projects
 * - clientsWaiting: Number of clients waiting for action
 * - reviewsPending: Number of reviews pending
 *
 * @param req - Express request with authenticated user
 * @param res - Express response
 */
export async function getDashboardStats(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (shouldUsePrisma) {
      // Use Prisma
      // 1. Count active projects (jobs)
      const activeJobsCount = await prisma.project.count({
        where: {
          userId: BigInt(userId),
          status: 'active',
        },
      });

      // 2. Count clients waiting (clients with status 'waiting' or workflow stage needing action)
      // For now, we'll count clients that need follow-up based on lastContactAt
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      const clientsWaitingCount = await prisma.client.count({
        where: {
          userId: BigInt(userId),
          status: {
            in: ['lead', 'active', 'negotiation'],
          },
          OR: [
            {
              lastContactAt: {
                lt: twoWeeksAgo,
              },
            },
            {
              lastContactAt: null,
            },
          ],
        },
      });

      // 3. Count reviews pending
      // We'll count video reviews with status 'pending' or 'draft'
      const reviewsPendingCount = await prisma.videoReview.count({
        where: {
          userId: BigInt(userId),
          status: {
            in: ['draft', 'pending'],
          },
        },
      });

      return res.json({
        success: true,
        data: {
          activeJobs: activeJobsCount,
          clientsWaiting: clientsWaitingCount,
          reviewsPending: reviewsPendingCount,
        },
      });
    } else {
      // Use SQLite
      // 1. Count active projects (jobs)
      const activeJobsResult = await db.prepare(
        'SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = ?'
      ).get(userId, 'active') as { count: number };

      // 2. Count clients waiting
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoISO = twoWeeksAgo.toISOString();

      const clientsWaitingResult = await db.prepare(`
        SELECT COUNT(*) as count
        FROM clients
        WHERE user_id = ?
        AND status IN ('lead', 'active', 'negotiation')
        AND (last_contact_at < ? OR last_contact_at IS NULL)
      `).get(userId, twoWeeksAgoISO) as { count: number };

      // 3. Count reviews pending
      const reviewsPendingResult = await db.prepare(`
        SELECT COUNT(*) as count
        FROM video_reviews
        WHERE user_id = ?
        AND status IN ('draft', 'pending')
      `).get(userId) as { count: number };

      return res.json({
        success: true,
        data: {
          activeJobs: activeJobsResult.count,
          clientsWaiting: clientsWaitingResult.count,
          reviewsPending: reviewsPendingResult.count,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics',
    });
  }
}

/**
 * GET /api/dashboard/finance-strip
 *
 * Returns finance statistics for the authenticated user:
 * - monthlyRevenue: Total revenue for current month
 * - jobsCompleted: Number of completed projects this month
 *
 * @param req - Express request with authenticated user
 * @param res - Express response
 */
export async function getFinanceStrip(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get current month boundaries
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    if (shouldUsePrisma) {
      // Use Prisma
      // 1. Calculate monthly revenue from financial entries
      const revenueResult = await prisma.financialEntry.aggregate({
        where: {
          userId: BigInt(userId),
          kind: 'revenue',
          status: 'paid',
          paidAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const monthlyRevenue = revenueResult._sum.amount || 0;

      // 2. Count completed projects this month
      const jobsCompleted = await prisma.project.count({
        where: {
          userId: BigInt(userId),
          status: 'completed',
          updatedAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      return res.json({
        success: true,
        data: {
          monthlyRevenue: Number(monthlyRevenue),
          jobsCompleted,
        },
      });
    } else {
      // Use SQLite
      const startOfMonthISO = startOfMonth.toISOString();
      const endOfMonthISO = endOfMonth.toISOString();

      // 1. Calculate monthly revenue
      const revenueResult = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM financial_entries
        WHERE user_id = ?
        AND kind = 'revenue'
        AND status = 'paid'
        AND paid_at >= ?
        AND paid_at <= ?
      `).get(userId, startOfMonthISO, endOfMonthISO) as { total: number };

      // 2. Count completed projects this month
      const jobsResult = await db.prepare(`
        SELECT COUNT(*) as count
        FROM projects
        WHERE user_id = ?
        AND status = 'completed'
        AND updated_at >= ?
        AND updated_at <= ?
      `).get(userId, startOfMonthISO, endOfMonthISO) as { count: number };

      return res.json({
        success: true,
        data: {
          monthlyRevenue: revenueResult.total,
          jobsCompleted: jobsResult.count,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching finance strip:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch finance statistics',
    });
  }
}

/**
 * GET /api/dashboard/user-info
 *
 * Returns basic user information for dashboard greeting.
 *
 * @param req - Express request with authenticated user
 * @param res - Express response
 */
export async function getUserInfo(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (shouldUsePrisma) {
      // Use Prisma
      const user = await prisma.user.findUnique({
        where: {
          id: BigInt(userId),
        },
        select: {
          name: true,
          email: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.json({
        success: true,
        data: {
          name: user.name || user.email.split('@')[0],
        },
      });
    } else {
      // Use SQLite
      const user = await db.prepare(
        'SELECT name, email FROM users WHERE id = ?'
      ).get(userId) as { name: string | null; email: string } | undefined;

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      return res.json({
        success: true,
        data: {
          name: user.name || user.email.split('@')[0],
        },
      });
    }
  } catch (error) {
    console.error('Error fetching user info:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user information',
    });
  }
}

/**
 * GET /api/dashboard/jobs/active
 *
 * Returns active jobs (projects) for the authenticated user.
 * Includes client information, calculated daysLeft, and urgent flag.
 *
 * @param req - Express request with authenticated user
 * @param res - Express response
 */
export async function getActiveJobs(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (shouldUsePrisma) {
      // Use Prisma
      const projects = await prisma.project.findMany({
        where: {
          userId: BigInt(userId),
          status: 'active',
        },
        include: {
          client: {
            select: {
              name: true,
              company: true,
            },
          },
        },
        orderBy: [
          {
            deadline: 'asc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });

      // Serialize and calculate additional fields
      const now = new Date();
      const serializedJobs = projects.map((project) => {
        const safe = jsonSafe(project);

        // Calculate daysLeft
        let daysLeft = 0;
        if (safe.deadline) {
          const deadlineDate = new Date(safe.deadline);
          const diffTime = deadlineDate.getTime() - now.getTime();
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Determine if urgent (< 3 days)
        const urgent = daysLeft > 0 && daysLeft < 3;

        // Format deadline
        const deadline = safe.deadline
          ? new Date(safe.deadline).toISOString().split('T')[0]
          : null;

        // Get client name
        const clientName = safe.client?.company || safe.client?.name || 'No Client';

        // Map status to JobStatus type
        const statusMap: Record<string, string> = {
          active: 'production',
          briefing: 'briefing',
          review: 'review',
          completed: 'delivered',
        };

        return {
          id: String(safe.id),
          title: safe.name,
          client: clientName,
          status: statusMap[safe.status] || 'production',
          deadline: deadline || 'No deadline',
          daysLeft: Math.max(0, daysLeft),
          progress: safe.progress || 0,
          urgent,
        };
      });

      return res.json({
        success: true,
        data: serializedJobs,
      });
    } else {
      // Use SQLite
      const projects = await db.prepare(`
        SELECT
          p.id,
          p.name,
          p.status,
          p.deadline,
          p.progress,
          COALESCE(c.company, c.name, 'No Client') as client_name
        FROM projects p
        LEFT JOIN clients c ON p.client_id = c.id
        WHERE p.user_id = ?
        AND p.status = 'active'
        ORDER BY
          CASE WHEN p.deadline IS NULL THEN 1 ELSE 0 END,
          p.deadline ASC,
          p.created_at DESC
      `).all(userId) as Array<{
        id: number;
        name: string;
        status: string;
        deadline: string | null;
        progress: number;
        client_name: string;
      }>;

      // Calculate additional fields
      const now = new Date();
      const serializedJobs = projects.map((project) => {
        // Calculate daysLeft
        let daysLeft = 0;
        if (project.deadline) {
          const deadlineDate = new Date(project.deadline);
          const diffTime = deadlineDate.getTime() - now.getTime();
          daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // Determine if urgent (< 3 days)
        const urgent = daysLeft > 0 && daysLeft < 3;

        // Format deadline
        const deadline = project.deadline
          ? new Date(project.deadline).toISOString().split('T')[0]
          : null;

        // Map status to JobStatus type
        const statusMap: Record<string, string> = {
          active: 'production',
          briefing: 'briefing',
          review: 'review',
          completed: 'delivered',
        };

        return {
          id: String(project.id),
          title: project.name,
          client: project.client_name,
          status: statusMap[project.status] || 'production',
          deadline: deadline || 'No deadline',
          daysLeft: Math.max(0, daysLeft),
          progress: project.progress || 0,
          urgent,
        };
      });

      return res.json({
        success: true,
        data: serializedJobs,
      });
    }
  } catch (error) {
    console.error('Error fetching active jobs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch active jobs',
    });
  }
}
