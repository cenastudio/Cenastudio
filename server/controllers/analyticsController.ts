import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbCountByCount } from "../models/types.js";

const FINANCIAL_KINDS = new Set(["income", "expense"]);
const FINANCIAL_STATUSES = new Set(["pending", "settled", "canceled"]);
const FINANCIAL_RECURRENCES = new Set(["once", "monthly"]);

function normalizeAmount(value: unknown) {
  const amount = Math.round(Number(value));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError("Informe um valor financeiro válido", 400);
  }
  return amount;
}

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

export const getFinancialOverview: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;

    const summary = db.prepare(`
      SELECT
        COALESCE(SUM(CASE
          WHEN kind = 'income' AND status = 'settled'
          AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = strftime('%Y-%m', 'now')
          THEN amount ELSE 0 END), 0) AS receivedMonth,
        COALESCE(SUM(CASE
          WHEN kind = 'expense' AND status = 'settled'
          AND strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) = strftime('%Y-%m', 'now')
          THEN amount ELSE 0 END), 0) AS expensesMonth,
        COALESCE(SUM(CASE WHEN kind = 'income' AND status = 'pending' THEN amount ELSE 0 END), 0) AS toReceive,
        COALESCE(SUM(CASE WHEN kind = 'expense' AND status = 'pending' THEN amount ELSE 0 END), 0) AS toPay,
        COALESCE(SUM(CASE
          WHEN kind = 'expense' AND recurrence = 'monthly' AND status != 'canceled'
          THEN amount ELSE 0 END), 0) AS fixedMonthly,
        COALESCE(SUM(CASE
          WHEN kind = 'income' AND recurrence = 'monthly' AND status != 'canceled'
          THEN amount ELSE 0 END), 0) AS recurringRevenue,
        COALESCE(SUM(CASE
          WHEN kind = 'income' AND status = 'pending' AND due_date < date('now')
          THEN amount ELSE 0 END), 0) AS overdueReceivables
      FROM financial_entries
      WHERE user_id = ?
    `).get(userId) as {
      receivedMonth: number;
      expensesMonth: number;
      toReceive: number;
      toPay: number;
      fixedMonthly: number;
      recurringRevenue: number;
      overdueReceivables: number;
    };

    const lostThisMonth = db.prepare(`
      SELECT COALESCE(SUM(estimated_value), 0) AS total
      FROM opportunities
      WHERE user_id = ? AND stage = 'lost'
      AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now')
    `).get(userId) as { total: number };

    const crmStageSummary = db.prepare(`
      SELECT
        COALESCE(SUM(CASE
          WHEN workflow_stage = 'lost'
          AND strftime('%Y-%m', updated_at) = strftime('%Y-%m', 'now')
          THEN total_spent ELSE 0 END), 0) AS lostValue,
        COALESCE(SUM(CASE
          WHEN workflow_stage IN ('prospect', 'contacted', 'qualified', 'proposal', 'negotiation', 'freela')
          THEN total_spent ELSE 0 END), 0) AS pipelineValue,
        COALESCE(SUM(CASE
          WHEN workflow_stage IN ('prospect', 'contacted', 'qualified', 'proposal', 'negotiation', 'freela')
          THEN total_spent * CASE workflow_stage
            WHEN 'prospect' THEN 0.10
            WHEN 'contacted' THEN 0.25
            WHEN 'qualified' THEN 0.50
            WHEN 'proposal' THEN 0.70
            WHEN 'negotiation' THEN 0.85
            WHEN 'freela' THEN 0.50
            ELSE 0 END
          ELSE 0 END), 0) AS weightedPipeline,
        COALESCE(SUM(CASE
          WHEN workflow_stage = 'recurrent'
          AND NOT EXISTS (
            SELECT 1 FROM financial_entries f
            WHERE f.user_id = clients.user_id
              AND f.client_id = clients.id
              AND f.kind = 'income'
              AND f.recurrence = 'monthly'
              AND f.status != 'canceled'
          )
          THEN total_spent ELSE 0 END), 0) AS recurringValue
      FROM clients
      WHERE user_id = ?
    `).get(userId) as {
      lostValue: number;
      pipelineValue: number;
      weightedPipeline: number;
      recurringValue: number;
    };

    const openPipeline = db.prepare(`
      SELECT
        COALESCE(SUM(estimated_value), 0) AS total,
        COALESCE(SUM(estimated_value * probability / 100.0), 0) AS weighted
      FROM opportunities
      WHERE user_id = ? AND stage NOT IN ('won', 'lost')
    `).get(userId) as { total: number; weighted: number };

    const monthlyCashflow = db.prepare(`
      SELECT
        strftime('%Y-%m', COALESCE(paid_at, due_date, created_at)) AS month,
        COALESCE(SUM(CASE WHEN kind = 'income' AND status = 'settled' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN kind = 'expense' AND status = 'settled' THEN amount ELSE 0 END), 0) AS expenses
      FROM financial_entries
      WHERE user_id = ?
        AND status = 'settled'
        AND date(COALESCE(paid_at, due_date, created_at)) >= date('now', 'start of month', '-5 months')
      GROUP BY month
      ORDER BY month ASC
    `).all(userId);

    const revenueSources = db.prepare(`
      SELECT category, COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count
      FROM financial_entries
      WHERE user_id = ? AND kind = 'income' AND status = 'settled'
      GROUP BY category
      ORDER BY amount DESC
      LIMIT 6
    `).all(userId);

    const topClientsFromLedger = db.prepare(`
      SELECT c.id, c.name, c.company, COALESCE(SUM(f.amount), 0) AS revenue
      FROM financial_entries f
      JOIN clients c ON c.id = f.client_id
      WHERE f.user_id = ? AND f.kind = 'income' AND f.status = 'settled'
      GROUP BY c.id, c.name, c.company
      ORDER BY revenue DESC
      LIMIT 6
    `).all(userId) as Array<{ id: number; name: string; company: string | null; revenue: number }>;

    const topClients = topClientsFromLedger.length > 0
      ? topClientsFromLedger
      : db.prepare(`
          SELECT id, name, company, COALESCE(total_spent, 0) AS revenue
          FROM clients
          WHERE user_id = ? AND COALESCE(total_spent, 0) > 0
          ORDER BY total_spent DESC
          LIMIT 6
        `).all(userId);

    const pendingEntries = db.prepare(`
      SELECT f.*, c.name AS client_name, c.company AS client_company
      FROM financial_entries f
      LEFT JOIN clients c ON c.id = f.client_id
      WHERE f.user_id = ? AND f.status = 'pending'
      ORDER BY
        CASE WHEN f.due_date IS NULL THEN 1 ELSE 0 END,
        f.due_date ASC,
        f.created_at DESC
      LIMIT 10
    `).all(userId);

    const recentEntries = db.prepare(`
      SELECT f.*, c.name AS client_name, c.company AS client_company
      FROM financial_entries f
      LEFT JOIN clients c ON c.id = f.client_id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT 12
    `).all(userId);

    const recurringClients = db.prepare(`
      SELECT COUNT(DISTINCT client_id) AS count
      FROM (
        SELECT id AS client_id
        FROM clients
        WHERE user_id = ? AND workflow_stage = 'recurrent'
        UNION
        SELECT client_id
        FROM financial_entries
        WHERE user_id = ? AND kind = 'income' AND recurrence = 'monthly'
          AND status != 'canceled' AND client_id IS NOT NULL
      )
    `).get(userId, userId) as { count: number };

    res.json({
      success: true,
      data: {
        summary: {
          ...summary,
          profitMonth: summary.receivedMonth - summary.expensesMonth,
          lossesMonth: lostThisMonth.total + crmStageSummary.lostValue,
          openPipeline: openPipeline.total,
          weightedPipeline: Math.round(openPipeline.weighted),
          crmOpenValue: crmStageSummary.pipelineValue,
          crmWeightedValue: Math.round(crmStageSummary.weightedPipeline),
          recurringRevenue: summary.recurringRevenue + crmStageSummary.recurringValue,
          recurringClients: recurringClients.count,
        },
        monthlyCashflow,
        revenueSources,
        topClients,
        pendingEntries,
        recentEntries,
      },
    });
  } catch (e) {
    next(e);
  }
};

export const createFinancialEntry: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      clientId,
      opportunityId,
      kind,
      description,
      category,
      amount,
      status,
      dueDate,
      paidAt,
      recurrence,
      isFixed,
      notes,
    } = req.body;

    if (!FINANCIAL_KINDS.has(kind)) throw new AppError("Tipo de lançamento inválido", 400);
    if (!description?.trim()) throw new AppError("A descrição é obrigatória", 400);
    const nextStatus = status || "pending";
    const nextRecurrence = recurrence || "once";
    if (!FINANCIAL_STATUSES.has(nextStatus)) throw new AppError("Status financeiro inválido", 400);
    if (!FINANCIAL_RECURRENCES.has(nextRecurrence)) throw new AppError("Recorrência inválida", 400);

    const entryAmount = normalizeAmount(amount);
    const settledAt = nextStatus === "settled"
      ? (paidAt || new Date().toISOString().slice(0, 10))
      : null;

    const result = db.prepare(`
      INSERT INTO financial_entries (
        user_id, client_id, opportunity_id, kind, description, category, amount,
        status, due_date, paid_at, recurrence, is_fixed, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      clientId || null,
      opportunityId || null,
      kind,
      description.trim(),
      category?.trim() || "geral",
      entryAmount,
      nextStatus,
      dueDate || null,
      settledAt,
      nextRecurrence,
      isFixed ? 1 : 0,
      notes?.trim() || null,
    );

    const created = db.prepare("SELECT * FROM financial_entries WHERE id = ? AND user_id = ?")
      .get(result.lastInsertRowid, userId);

    res.json({ success: true, data: created });
  } catch (e) {
    next(e);
  }
};

export const updateFinancialEntry: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const current = db.prepare("SELECT * FROM financial_entries WHERE id = ? AND user_id = ?")
      .get(id, userId) as Record<string, unknown> | undefined;
    if (!current) throw new AppError("Lançamento não encontrado", 404);

    const status = req.body.status ?? current.status;
    if (!FINANCIAL_STATUSES.has(String(status))) throw new AppError("Status financeiro inválido", 400);
    const paidAt = status === "settled"
      ? (req.body.paidAt || current.paid_at || new Date().toISOString().slice(0, 10))
      : null;

    db.prepare(`
      UPDATE financial_entries
      SET status = ?, paid_at = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(status, paidAt, id, userId);

    const updated = db.prepare("SELECT * FROM financial_entries WHERE id = ? AND user_id = ?")
      .get(id, userId);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

export const deleteFinancialEntry: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const result = db.prepare("DELETE FROM financial_entries WHERE id = ? AND user_id = ?")
      .run(id, userId);
    if (!result.changes) throw new AppError("Lançamento não encontrado", 404);
    res.json({ success: true, data: { id } });
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
