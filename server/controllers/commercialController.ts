/**
 * Commercial Hub Controller
 *
 * Handles commercial metrics and sales tracking:
 * - GET /api/commercial/dashboard - General stats
 * - GET /api/commercial/revenue - Revenue tracking
 * - GET /api/commercial/forecast - Sales forecast (3 months ahead)
 * - GET /api/commercial/metrics - Detailed KPIs
 * - GET /api/commercial/funnel - Sales funnel data
 * - GET /api/commercial/comparison - Period-over-period comparison
 */

import type { Request, Response } from 'express';
import { prisma, shouldUsePrisma } from '../models/prisma.js';
import { db } from '../models/db.js';

interface CommercialDashboardStats {
  totalRevenue: number;
  monthlyRevenue: number;
  conversionRate: number;
  pipelineValue: number;
  averageTicket: number;
  activeDeals: number;
  wonDeals: number;
  lostDeals: number;
}

/**
 * GET /api/commercial/dashboard
 *
 * Returns general commercial statistics for the authenticated user.
 */
export async function getCommercialDashboard(req: Request, res: Response) {
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
      const userIdBigInt = BigInt(userId);

      // Get all financial entries (revenue)
      const financialEntries = await prisma.financialEntry.findMany({
        where: {
          userId: userIdBigInt,
          kind: 'income',
          status: 'settled',
        },
        select: {
          amount: true,
          paidAt: true,
        },
      });

      // Get current month start/end
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Calculate total revenue
      const totalRevenue = financialEntries.reduce((sum, entry) => sum + entry.amount, 0);

      // Calculate monthly revenue
      const monthlyRevenue = financialEntries
        .filter((entry) => entry.paidAt && entry.paidAt >= monthStart && entry.paidAt <= monthEnd)
        .reduce((sum, entry) => sum + entry.amount, 0);

      // Get opportunities for conversion and pipeline
      const opportunities = await prisma.opportunity.findMany({
        where: { userId: userIdBigInt },
        select: {
          id: true,
          stage: true,
          estimatedValue: true,
        },
      });

      const activeDeals = opportunities.filter((opp) =>
        ['prospect', 'qualified', 'proposal', 'negotiation'].includes(opp.stage)
      ).length;

      const wonDeals = opportunities.filter((opp) => opp.stage === 'won').length;
      const lostDeals = opportunities.filter((opp) => opp.stage === 'lost').length;

      const totalDeals = opportunities.length;
      const conversionRate = totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(1) : '0.0';

      const pipelineValue = opportunities
        .filter((opp) => ['prospect', 'qualified', 'proposal', 'negotiation'].includes(opp.stage))
        .reduce((sum, opp) => sum + (opp.estimatedValue || 0), 0);

      const averageTicket = wonDeals > 0
        ? Math.round(totalRevenue / wonDeals)
        : 0;

      const stats: CommercialDashboardStats = {
        totalRevenue,
        monthlyRevenue,
        conversionRate: parseFloat(conversionRate),
        pipelineValue,
        averageTicket,
        activeDeals,
        wonDeals,
        lostDeals,
      };

      return res.json({
        success: true,
        data: stats,
      });
    } else {
      // Use SQLite
      // Get total revenue
      const revenueQuery = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total_revenue
        FROM financial_entries
        WHERE user_id = ? AND kind = 'income' AND status = 'settled'
      `).get(userId) as { total_revenue: number };

      // Get monthly revenue
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const monthlyQuery = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as monthly_revenue
        FROM financial_entries
        WHERE user_id = ?
          AND kind = 'income'
          AND status = 'settled'
          AND paid_at >= ?
          AND paid_at <= ?
      `).get(userId, monthStart, monthEnd) as { monthly_revenue: number };

      // Get opportunities stats
      const oppsQuery = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN stage IN ('prospect', 'qualified', 'proposal', 'negotiation') THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) as won,
          SUM(CASE WHEN stage = 'lost' THEN 1 ELSE 0 END) as lost,
          SUM(CASE WHEN stage IN ('prospect', 'qualified', 'proposal', 'negotiation') THEN estimated_value ELSE 0 END) as pipeline_value
        FROM opportunities
        WHERE user_id = ?
      `).get(userId) as {
        total: number;
        active: number;
        won: number;
        lost: number;
        pipeline_value: number;
      };

      const totalRevenue = revenueQuery.total_revenue;
      const monthlyRevenue = monthlyQuery.monthly_revenue;
      const conversionRate = oppsQuery.total > 0
        ? ((oppsQuery.won / oppsQuery.total) * 100).toFixed(1)
        : '0.0';
      const averageTicket = oppsQuery.won > 0
        ? Math.round(totalRevenue / oppsQuery.won)
        : 0;

      const stats: CommercialDashboardStats = {
        totalRevenue,
        monthlyRevenue,
        conversionRate: parseFloat(conversionRate),
        pipelineValue: oppsQuery.pipeline_value || 0,
        averageTicket,
        activeDeals: oppsQuery.active,
        wonDeals: oppsQuery.won,
        lostDeals: oppsQuery.lost,
      };

      return res.json({
        success: true,
        data: stats,
      });
    }
  } catch (error) {
    console.error('Error fetching commercial dashboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch commercial dashboard',
    });
  }
}

/**
 * GET /api/commercial/revenue
 *
 * Returns revenue tracking data over time (last 12 months).
 */
export async function getRevenueTracking(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get last 12 months
    const months = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');

      if (shouldUsePrisma) {
        const entries = await prisma.financialEntry.findMany({
          where: {
            userId: BigInt(userId),
            kind: 'income',
            status: 'settled',
            paidAt: { gte: monthStart, lte: monthEnd },
          },
          select: { amount: true },
        });
        const revenue = entries.reduce((sum, e) => sum + e.amount, 0);
        months.push({ month: monthName, revenue });
      } else {
        const result = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as revenue
          FROM financial_entries
          WHERE user_id = ?
            AND kind = 'income'
            AND status = 'settled'
            AND paid_at >= ?
            AND paid_at <= ?
        `).get(userId, monthStart.toISOString(), monthEnd.toISOString()) as { revenue: number };
        months.push({ month: monthName, revenue: result.revenue });
      }
    }

    return res.json({
      success: true,
      data: months,
    });
  } catch (error) {
    console.error('Error fetching revenue tracking:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch revenue tracking',
    });
  }
}

/**
 * GET /api/commercial/metrics
 *
 * Returns detailed KPIs and metrics for commercial analysis.
 */
export async function getCommercialMetrics(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    if (shouldUsePrisma) {
      const userIdBigInt = BigInt(userId);

      // Get all opportunities
      const opportunities = await prisma.opportunity.findMany({
        where: { userId: userIdBigInt },
        select: {
          id: true,
          stage: true,
          estimatedValue: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Calculate Win Rate
      const totalOpportunities = opportunities.length;
      const wonOpportunities = opportunities.filter((o) => o.stage === 'won').length;
      const lostOpportunities = opportunities.filter((o) => o.stage === 'lost').length;
      const winRate = totalOpportunities > 0 ? ((wonOpportunities / totalOpportunities) * 100).toFixed(1) : '0.0';

      // Calculate Average Close Time (days from creation to won)
      const wonOpps = opportunities.filter((o) => o.stage === 'won');
      const closeTimes = wonOpps.map((o) => {
        const created = new Date(o.createdAt);
        const updated = new Date(o.updatedAt);
        return Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });
      const avgCloseTime = closeTimes.length > 0
        ? Math.round(closeTimes.reduce((sum, time) => sum + time, 0) / closeTimes.length)
        : 0;

      // Calculate Average Ticket by Stage
      const stageTickets: Record<string, { count: number; totalValue: number; avgTicket: number }> = {};
      const stages = ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

      for (const stage of stages) {
        const stageOpps = opportunities.filter((o) => o.stage === stage);
        const totalValue = stageOpps.reduce((sum, o) => sum + (o.estimatedValue || 0), 0);
        const count = stageOpps.length;
        const avgTicket = count > 0 ? Math.round(totalValue / count) : 0;
        stageTickets[stage] = { count, totalValue, avgTicket };
      }

      // Calculate Pipeline Velocity (deals per month)
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const recentOpps = opportunities.filter((o) => new Date(o.createdAt) >= monthAgo);
      const pipelineVelocity = recentOpps.length;

      // Get previous month data for comparison
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
      const previousMonthOpps = opportunities.filter((o) => {
        const created = new Date(o.createdAt);
        return created >= twoMonthsAgo && created < monthAgo;
      });
      const previousVelocity = previousMonthOpps.length;
      const velocityChange = previousVelocity > 0
        ? (((pipelineVelocity - previousVelocity) / previousVelocity) * 100).toFixed(1)
        : '0.0';

      return res.json({
        success: true,
        data: {
          winRate: parseFloat(winRate),
          avgCloseTime,
          stageTickets,
          pipelineVelocity,
          velocityChange: parseFloat(velocityChange),
          totalOpportunities,
          wonOpportunities,
          lostOpportunities,
        },
      });
    } else {
      // SQLite implementation
      const oppsQuery = db.prepare(`
        SELECT
          stage,
          estimated_value,
          created_at,
          updated_at
        FROM opportunities
        WHERE user_id = ?
      `).all(userId) as Array<{
        stage: string;
        estimated_value: number;
        created_at: string;
        updated_at: string;
      }>;

      const totalOpportunities = oppsQuery.length;
      const wonOpportunities = oppsQuery.filter((o) => o.stage === 'won').length;
      const lostOpportunities = oppsQuery.filter((o) => o.stage === 'lost').length;
      const winRate = totalOpportunities > 0 ? ((wonOpportunities / totalOpportunities) * 100).toFixed(1) : '0.0';

      // Average Close Time
      const wonOpps = oppsQuery.filter((o) => o.stage === 'won');
      const closeTimes = wonOpps.map((o) => {
        const created = new Date(o.created_at);
        const updated = new Date(o.updated_at);
        return Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      });
      const avgCloseTime = closeTimes.length > 0
        ? Math.round(closeTimes.reduce((sum, time) => sum + time, 0) / closeTimes.length)
        : 0;

      // Stage Tickets
      const stageTickets: Record<string, { count: number; totalValue: number; avgTicket: number }> = {};
      const stages = ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

      for (const stage of stages) {
        const stageOpps = oppsQuery.filter((o) => o.stage === stage);
        const totalValue = stageOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0);
        const count = stageOpps.length;
        const avgTicket = count > 0 ? Math.round(totalValue / count) : 0;
        stageTickets[stage] = { count, totalValue, avgTicket };
      }

      // Pipeline Velocity
      const now = new Date();
      const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const recentOpps = oppsQuery.filter((o) => new Date(o.created_at) >= monthAgo);
      const pipelineVelocity = recentOpps.length;

      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
      const previousMonthOpps = oppsQuery.filter((o) => {
        const created = new Date(o.created_at);
        return created >= twoMonthsAgo && created < monthAgo;
      });
      const previousVelocity = previousMonthOpps.length;
      const velocityChange = previousVelocity > 0
        ? (((pipelineVelocity - previousVelocity) / previousVelocity) * 100).toFixed(1)
        : '0.0';

      return res.json({
        success: true,
        data: {
          winRate: parseFloat(winRate),
          avgCloseTime,
          stageTickets,
          pipelineVelocity,
          velocityChange: parseFloat(velocityChange),
          totalOpportunities,
          wonOpportunities,
          lostOpportunities,
        },
      });
    }
  } catch (error) {
    console.error('Error fetching commercial metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch commercial metrics',
    });
  }
}

/**
 * GET /api/commercial/funnel
 *
 * Returns sales funnel data with counts and values per stage.
 */
export async function getSalesFunnel(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const stages = ['prospect', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
    const funnel = [];

    if (shouldUsePrisma) {
      for (const stage of stages) {
        const opportunities = await prisma.opportunity.findMany({
          where: { userId: BigInt(userId), stage },
          select: { estimatedValue: true },
        });
        funnel.push({
          stage,
          count: opportunities.length,
          value: opportunities.reduce((sum, o) => sum + (o.estimatedValue || 0), 0),
        });
      }
    } else {
      for (const stage of stages) {
        const result = db.prepare(`
          SELECT
            COUNT(*) as count,
            COALESCE(SUM(estimated_value), 0) as value
          FROM opportunities
          WHERE user_id = ? AND stage = ?
        `).get(userId, stage) as { count: number; value: number };
        funnel.push({ stage, ...result });
      }
    }

    return res.json({
      success: true,
      data: funnel,
    });
  } catch (error) {
    console.error('Error fetching sales funnel:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales funnel',
    });
  }
}


/**
 * GET /api/commercial/forecast
 *
 * Returns sales forecast for the next 3 months using linear regression.
 * Based on last 12 months of revenue data.
 */
export async function getSalesForecast(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    // Get last 12 months of revenue data
    const months: Array<{ month: string; revenue: number; monthIndex: number }> = [];
    const now = new Date();

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');

      if (shouldUsePrisma) {
        const entries = await prisma.financialEntry.findMany({
          where: {
            userId: BigInt(userId),
            kind: 'income',
            status: 'settled',
            paidAt: { gte: monthStart, lte: monthEnd },
          },
          select: { amount: true },
        });
        const revenue = entries.reduce((sum, e) => sum + e.amount, 0);
        months.push({ month: monthName, revenue, monthIndex: 11 - i });
      } else {
        const result = db.prepare(`
          SELECT COALESCE(SUM(amount), 0) as revenue
          FROM financial_entries
          WHERE user_id = ?
            AND kind = 'income'
            AND status = 'settled'
            AND paid_at >= ?
            AND paid_at <= ?
        `).get(userId, monthStart.toISOString(), monthEnd.toISOString()) as { revenue: number };
        months.push({ month: monthName, revenue: result.revenue, monthIndex: 11 - i });
      }
    }

    // Simple linear regression: y = mx + b
    // x = month index (0-11), y = revenue
    const n = months.length;
    const sumX = months.reduce((sum, m) => sum + m.monthIndex, 0);
    const sumY = months.reduce((sum, m) => sum + m.revenue, 0);
    const sumXY = months.reduce((sum, m) => sum + m.monthIndex * m.revenue, 0);
    const sumX2 = months.reduce((sum, m) => sum + m.monthIndex * m.monthIndex, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Project next 3 months
    const forecast = [];
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = futureDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
      const monthIndex = 11 + i;
      const predictedRevenue = Math.max(0, Math.round(slope * monthIndex + intercept));
      forecast.push({
        month: monthName,
        revenue: predictedRevenue,
        isForecast: true,
      });
    }

    // Calculate confidence metrics
    const avgRevenue = sumY / n;
    const recentTrend = months.length >= 3
      ? months.slice(-3).reduce((sum, m) => sum + m.revenue, 0) / 3
      : avgRevenue;

    return res.json({
      success: true,
      data: {
        historical: months.map(({ month, revenue }) => ({ month, revenue, isForecast: false })),
        forecast,
        metrics: {
          avgRevenue: Math.round(avgRevenue),
          recentTrend: Math.round(recentTrend),
          growthRate: slope > 0 ? ((slope / avgRevenue) * 100).toFixed(2) : '0.00',
          confidence: Math.abs(slope) > avgRevenue * 0.1 ? 'high' : 'medium',
        },
      },
    });
  } catch (error) {
    console.error('Error fetching sales forecast:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales forecast',
    });
  }
}

/**
 * GET /api/commercial/comparison
 *
 * Returns period-over-period comparison for dashboard stats.
 * Compares current period with previous period.
 */
export async function getPeriodComparison(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const now = new Date();

    // Current month
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Previous month
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    if (shouldUsePrisma) {
      const userIdBigInt = BigInt(userId);

      // Current month revenue
      const currentRevenue = await prisma.financialEntry.findMany({
        where: {
          userId: userIdBigInt,
          kind: 'income',
          status: 'settled',
          paidAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        select: { amount: true },
      });
      const currentTotal = currentRevenue.reduce((sum, e) => sum + e.amount, 0);

      // Previous month revenue
      const previousRevenue = await prisma.financialEntry.findMany({
        where: {
          userId: userIdBigInt,
          kind: 'income',
          status: 'settled',
          paidAt: { gte: previousMonthStart, lte: previousMonthEnd },
        },
        select: { amount: true },
      });
      const previousTotal = previousRevenue.reduce((sum, e) => sum + e.amount, 0);

      // Current opportunities
      const currentOpps = await prisma.opportunity.findMany({
        where: {
          userId: userIdBigInt,
          createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        select: { stage: true, estimatedValue: true },
      });

      // Previous opportunities
      const previousOpps = await prisma.opportunity.findMany({
        where: {
          userId: userIdBigInt,
          createdAt: { gte: previousMonthStart, lte: previousMonthEnd },
        },
        select: { stage: true, estimatedValue: true },
      });

      const currentWon = currentOpps.filter(o => o.stage === 'won').length;
      const previousWon = previousOpps.filter(o => o.stage === 'won').length;

      const currentConversion = currentOpps.length > 0 ? (currentWon / currentOpps.length) * 100 : 0;
      const previousConversion = previousOpps.length > 0 ? (previousWon / previousOpps.length) * 100 : 0;

      const currentPipeline = currentOpps
        .filter(o => ['prospect', 'qualified', 'proposal', 'negotiation'].includes(o.stage))
        .reduce((sum, o) => sum + (o.estimatedValue || 0), 0);

      const previousPipeline = previousOpps
        .filter(o => ['prospect', 'qualified', 'proposal', 'negotiation'].includes(o.stage))
        .reduce((sum, o) => sum + (o.estimatedValue || 0), 0);

      return res.json({
        success: true,
        data: {
          revenue: {
            current: currentTotal,
            previous: previousTotal,
            change: previousTotal > 0 ? (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1) : '0.0',
            isPositive: currentTotal >= previousTotal,
          },
          conversionRate: {
            current: parseFloat(currentConversion.toFixed(1)),
            previous: parseFloat(previousConversion.toFixed(1)),
            change: previousConversion > 0 ? (((currentConversion - previousConversion) / previousConversion) * 100).toFixed(1) : '0.0',
            isPositive: currentConversion >= previousConversion,
          },
          pipelineValue: {
            current: currentPipeline,
            previous: previousPipeline,
            change: previousPipeline > 0 ? (((currentPipeline - previousPipeline) / previousPipeline) * 100).toFixed(1) : '0.0',
            isPositive: currentPipeline >= previousPipeline,
          },
          activeDeals: {
            current: currentOpps.filter(o => ['prospect', 'qualified', 'proposal', 'negotiation'].includes(o.stage)).length,
            previous: previousOpps.filter(o => ['prospect', 'qualified', 'proposal', 'negotiation'].includes(o.stage)).length,
            change: '0.0', // Simple count comparison
            isPositive: currentOpps.length >= previousOpps.length,
          },
        },
      });
    } else {
      // SQLite implementation
      const currentRevenueResult = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM financial_entries
        WHERE user_id = ?
          AND kind = 'income'
          AND status = 'settled'
          AND paid_at >= ?
          AND paid_at <= ?
      `).get(userId, currentMonthStart.toISOString(), currentMonthEnd.toISOString()) as { total: number };

      const previousRevenueResult = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM financial_entries
        WHERE user_id = ?
          AND kind = 'income'
          AND status = 'settled'
          AND paid_at >= ?
          AND paid_at <= ?
      `).get(userId, previousMonthStart.toISOString(), previousMonthEnd.toISOString()) as { total: number };

      const currentOppsResult = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) as won,
          SUM(CASE WHEN stage IN ('prospect', 'qualified', 'proposal', 'negotiation') THEN estimated_value ELSE 0 END) as pipeline
        FROM opportunities
        WHERE user_id = ?
          AND created_at >= ?
          AND created_at <= ?
      `).get(userId, currentMonthStart.toISOString(), currentMonthEnd.toISOString()) as {
        total: number;
        won: number;
        pipeline: number;
      };

      const previousOppsResult = db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN stage = 'won' THEN 1 ELSE 0 END) as won,
          SUM(CASE WHEN stage IN ('prospect', 'qualified', 'proposal', 'negotiation') THEN estimated_value ELSE 0 END) as pipeline
        FROM opportunities
        WHERE user_id = ?
          AND created_at >= ?
          AND created_at <= ?
      `).get(userId, previousMonthStart.toISOString(), previousMonthEnd.toISOString()) as {
        total: number;
        won: number;
        pipeline: number;
      };

      const currentConversion = currentOppsResult.total > 0 ? (currentOppsResult.won / currentOppsResult.total) * 100 : 0;
      const previousConversion = previousOppsResult.total > 0 ? (previousOppsResult.won / previousOppsResult.total) * 100 : 0;

      return res.json({
        success: true,
        data: {
          revenue: {
            current: currentRevenueResult.total,
            previous: previousRevenueResult.total,
            change: previousRevenueResult.total > 0
              ? (((currentRevenueResult.total - previousRevenueResult.total) / previousRevenueResult.total) * 100).toFixed(1)
              : '0.0',
            isPositive: currentRevenueResult.total >= previousRevenueResult.total,
          },
          conversionRate: {
            current: parseFloat(currentConversion.toFixed(1)),
            previous: parseFloat(previousConversion.toFixed(1)),
            change: previousConversion > 0
              ? (((currentConversion - previousConversion) / previousConversion) * 100).toFixed(1)
              : '0.0',
            isPositive: currentConversion >= previousConversion,
          },
          pipelineValue: {
            current: currentOppsResult.pipeline,
            previous: previousOppsResult.pipeline,
            change: previousOppsResult.pipeline > 0
              ? (((currentOppsResult.pipeline - previousOppsResult.pipeline) / previousOppsResult.pipeline) * 100).toFixed(1)
              : '0.0',
            isPositive: currentOppsResult.pipeline >= previousOppsResult.pipeline,
          },
          activeDeals: {
            current: currentOppsResult.total,
            previous: previousOppsResult.total,
            change: '0.0',
            isPositive: currentOppsResult.total >= previousOppsResult.total,
          },
        },
      });
    }
  } catch (error) {
    console.error('Error fetching period comparison:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch period comparison',
    });
  }
}
