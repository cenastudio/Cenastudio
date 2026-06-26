import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbCountByCount } from "../models/types.js";

// Get overall analytics for the user
export const getOverallAnalytics: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Project stats
    const totalProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ?").get(userId) as DbCountByCount;
    const activeProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'active'").get(userId) as DbCountByCount;

    const totalClients = db.prepare("SELECT COUNT(*) as count FROM clients WHERE user_id = ?").get(userId) as DbCountByCount;
    const totalClientValue = db.prepare("SELECT COALESCE(SUM(total_spent), 0) as total FROM clients WHERE user_id = ?").get(userId) as { total: number };

    const totalOpportunities = db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE user_id = ?").get(userId) as DbCountByCount;
    const pipelineValue = db.prepare("SELECT COALESCE(SUM(estimated_value), 0) as total FROM opportunities WHERE user_id = ? AND stage != 'lost'").get(userId) as { total: number };

    const wonThisMonth = db.prepare("SELECT COALESCE(SUM(estimated_value), 0) as total FROM opportunities WHERE user_id = ? AND stage = 'won' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").get(userId) as { total: number };

    const totalGenerations = db.prepare("SELECT COUNT(*) as count FROM generations WHERE user_id = ?").get(userId) as DbCountByCount;
    const totalCollaborators = db.prepare("SELECT COUNT(*) as count FROM collaborators WHERE user_id = ?").get(userId) as DbCountByCount;

    res.json({
      success: true,
      data: {
        projects: {
          total: totalProjects.count,
          active: activeProjects.count,
        },
        clients: {
          total: totalClients.count,
          totalValue: totalClientValue.total,
        },
        pipeline: {
          totalOpportunities: totalOpportunities.count,
          pipelineValue: pipelineValue.total,
          wonThisMonth: wonThisMonth.total,
        },
        ai: {
          totalGenerations: totalGenerations.count,
        },
        team: {
          totalCollaborators: totalCollaborators.count,
        },
      },
    });
  } catch (e) {
    next(e);
  }
};

// Get project-specific analytics
export const getProjectAnalytics: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.id);

    if (!projectId) {
      throw new AppError("Project ID is required", 400);
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    // Tool usage stats
    const toolUsage = db
      .prepare(
        `SELECT tool_id, COUNT(*) as count 
         FROM project_states 
         WHERE project_id = ? 
         GROUP BY tool_id`,
      )
      .all(projectId);

    // Total generations for this project
    const totalGenerations = db.prepare("SELECT COUNT(*) as count FROM generations WHERE project_id = ?").get(projectId) as DbCountByCount;
    const totalFiles = db.prepare("SELECT COUNT(*) as count FROM files WHERE project_id = ?").get(projectId) as DbCountByCount;
    const totalMembers = db.prepare("SELECT COUNT(*) as count FROM project_members WHERE project_id = ?").get(projectId) as DbCountByCount;

    res.json({
      success: true,
      data: {
        project,
        toolUsage,
        totalGenerations: totalGenerations.count,
        totalFiles: totalFiles.count,
        totalMembers: totalMembers.count,
      },
    });
  } catch (e) {
    next(e);
  }
};

// Get revenue analytics
export const getRevenueAnalytics: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Revenue by month (last 6 months)
    const revenueByMonth = db
      .prepare(
        `SELECT 
           strftime('%Y-%m', created_at) as month,
           COALESCE(SUM(estimated_value), 0) as revenue,
           COUNT(*) as count
         FROM opportunities 
         WHERE user_id = ? AND stage = 'won'
         GROUP BY strftime('%Y-%m', created_at)
         ORDER BY month DESC
         LIMIT 6`,
      )
      .all(userId);

    // Revenue by segment
    const revenueBySegment = db
      .prepare(
        `SELECT 
           c.segment,
           COALESCE(SUM(o.estimated_value), 0) as revenue,
           COUNT(*) as count
         FROM opportunities o
         LEFT JOIN clients c ON o.client_id = c.id
         WHERE o.user_id = ? AND o.stage = 'won'
         GROUP BY c.segment`,
      )
      .all(userId);

    // Average deal size
    const avgDealSize = db
      .prepare(
        "SELECT COALESCE(AVG(estimated_value), 0) as avg FROM opportunities WHERE user_id = ? AND stage = 'won'",
      )
      .get(userId) as { avg: number };

    const totalOpps = db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE user_id = ?").get(userId) as DbCountByCount;
    const wonOpps = db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE user_id = ? AND stage = 'won'").get(userId) as DbCountByCount;

    const winRate = totalOpps.count > 0 ? (wonOpps.count / totalOpps.count) * 100 : 0;

    res.json({
      success: true,
      data: {
        revenueByMonth,
        revenueBySegment,
        avgDealSize: avgDealSize.avg || 0,
        winRate,
      },
    });
  } catch (e) {
    next(e);
  }
};

// Get activity analytics
export const getActivityAnalytics: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 30;

    // Recent activities
    const recentProjects = db
      .prepare(
        `SELECT COUNT(*) as count 
         FROM projects 
         WHERE user_id = ? AND created_at >= datetime('now', '-' || ? || ' days')`,
      )
      .get(userId, days) as { count: number };

    const recentGenerations = db
      .prepare(
        `SELECT COUNT(*) as count 
         FROM generations 
         WHERE user_id = ? AND created_at >= datetime('now', '-' || ? || ' days')`,
      )
      .get(userId, days) as { count: number };

    const recentInteractions = db
      .prepare(
        `SELECT COUNT(*) as count 
         FROM interactions 
         WHERE user_id = ? AND created_at >= datetime('now', '-' || ? || ' days')`,
      )
      .get(userId, days) as { count: number };

    const recentFiles = db
      .prepare(
        `SELECT COUNT(*) as count 
         FROM files 
         WHERE user_id = ? AND created_at >= datetime('now', '-' || ? || ' days')`,
      )
      .get(userId, days) as { count: number };

    // Activity by day
    const activityByDay = db
      .prepare(
        `SELECT 
           strftime('%Y-%m-%d', created_at) as day,
           COUNT(*) as count
         FROM (
           SELECT 'project' as type, created_at FROM projects WHERE user_id = ?
           UNION ALL
           SELECT 'generation' as type, created_at FROM generations WHERE user_id = ?
           UNION ALL
           SELECT 'interaction' as type, created_at FROM interactions WHERE user_id = ?
           UNION ALL
           SELECT 'file' as type, created_at FROM files WHERE user_id = ?
         )
         WHERE created_at >= datetime('now', '-' || ? || ' days')
         GROUP BY strftime('%Y-%m-%d', created_at)
         ORDER BY day DESC`,
      )
      .all(userId, userId, userId, userId, days);

    res.json({
      success: true,
      data: {
        recentProjects: recentProjects.count,
        recentGenerations: recentGenerations.count,
        recentInteractions: recentInteractions.count,
        recentFiles: recentFiles.count,
        activityByDay,
      },
    });
  } catch (e) {
    next(e);
  }
};
