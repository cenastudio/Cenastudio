import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbCountByCount } from "../models/types.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import { getWidgetData } from "../lib/analytics/dataMappers.js";

function monthKey(value: Date) { return value.toISOString().slice(0, 7); }
function serializeFinancial(value: any) {
  const result = withSnakeCase(value, {
    userId: "user_id", clientId: "client_id", opportunityId: "opportunity_id",
    projectId: "project_id", dueDate: "due_date", paidAt: "paid_at", isFixed: "is_fixed",
    createdAt: "created_at", updatedAt: "updated_at",
  }) as any;
  if (result.client) {
    result.client_name = result.client.name;
    result.client_company = result.client.company;
    delete result.client;
  }
  return result;
}

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

function normalizeOptionalId(value: unknown, label: string): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`${label} inválido`, 400);
  }
  return parsed;
}

// Get overall analytics for the user
export const getOverallAnalytics: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
      const [totalProjects, activeProjects, totalClients, clientValue, totalOpportunities, pipeline, won, generations, teamMemberCount] = await Promise.all([
        prisma.project.count({ where: { userId: owner } }), prisma.project.count({ where: { userId: owner, status: "active" } }),
        prisma.client.count({ where: { userId: owner } }), prisma.client.aggregate({ where: { userId: owner }, _sum: { totalSpent: true } }),
        prisma.opportunity.count({ where: { userId: owner } }), prisma.opportunity.aggregate({ where: { userId: owner, stage: { not: "lost" } }, _sum: { estimatedValue: true } }),
        prisma.opportunity.aggregate({ where: { userId: owner, stage: "won", createdAt: { gte: start } }, _sum: { estimatedValue: true } }),
        prisma.generation.count({ where: { userId: owner } }),
        (prisma as any).workspaceMember.count({
          where: { workspace: { ownerUserId: owner }, role: { not: "owner" }, status: "active" },
        }),
      ]);
      res.json({ success: true, data: {
        projects: { total: totalProjects, active: activeProjects },
        clients: { total: totalClients, totalValue: clientValue._sum.totalSpent || 0 },
        pipeline: { totalOpportunities, pipelineValue: pipeline._sum.estimatedValue || 0, wonThisMonth: won._sum.estimatedValue || 0 },
        ai: { totalGenerations: generations }, team: { totalCollaborators: teamMemberCount },
      } });
      return;
    }

    // Project stats
    const totalProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ?").get(userId) as DbCountByCount;
    const activeProjects = db.prepare("SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND status = 'active'").get(userId) as DbCountByCount;

    const totalClients = db.prepare("SELECT COUNT(*) as count FROM clients WHERE user_id = ?").get(userId) as DbCountByCount;
    const totalClientValue = db.prepare("SELECT COALESCE(SUM(total_spent), 0) as total FROM clients WHERE user_id = ?").get(userId) as { total: number };

    const totalOpportunities = db.prepare("SELECT COUNT(*) as count FROM opportunities WHERE user_id = ?").get(userId) as DbCountByCount;
    const pipelineValue = db.prepare("SELECT COALESCE(SUM(estimated_value), 0) as total FROM opportunities WHERE user_id = ? AND stage != 'lost'").get(userId) as { total: number };

    const wonThisMonth = db.prepare("SELECT COALESCE(SUM(estimated_value), 0) as total FROM opportunities WHERE user_id = ? AND stage = 'won' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')").get(userId) as { total: number };

    const totalGenerations = db.prepare("SELECT COUNT(*) as count FROM generations WHERE user_id = ?").get(userId) as DbCountByCount;
    const totalCollaborators = db.prepare(
      `SELECT COUNT(*) as count
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       WHERE w.owner_user_id = ? AND wm.role != 'owner' AND wm.status = 'active'`,
    ).get(userId) as DbCountByCount;

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
export const getProjectAnalytics: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.id);

    if (!projectId) {
      throw new AppError("Project ID is required", 400);
    }
    if (shouldUsePrisma) {
      const project = await prisma.project.findFirst({ where: { id: BigInt(projectId), userId: BigInt(userId) } });
      if (!project) throw new AppError("Project not found", 404);
      const [usage, totalGenerations, totalFiles, totalMembers] = await Promise.all([
        prisma.projectState.groupBy({ by: ["toolId"], where: { projectId: project.id }, _count: { _all: true } }),
        prisma.generation.count({ where: { projectId: project.id } }), prisma.file.count({ where: { projectId: project.id } }),
        prisma.projectMember.count({ where: { projectId: project.id } }),
      ]);
      res.json({ success: true, data: {
        project: withSnakeCase(project as any, { userId: "user_id", clientId: "client_id", metadataJson: "metadata_json", createdAt: "created_at", updatedAt: "updated_at" }),
        toolUsage: usage.map((item) => ({ tool_id: item.toolId, count: item._count._all })),
        totalGenerations, totalFiles, totalMembers,
      } });
      return;
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
export const getRevenueAnalytics: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const [won, totalOpps] = await Promise.all([
        prisma.opportunity.findMany({ where: { userId: owner, stage: "won" }, include: { client: { select: { segment: true } } } }),
        prisma.opportunity.count({ where: { userId: owner } }),
      ]);
      const months = new Map<string, { revenue: number; count: number }>();
      const segments = new Map<string, { revenue: number; count: number }>();
      for (const item of won) {
        const month = monthKey(item.createdAt);
        const monthRow = months.get(month) || { revenue: 0, count: 0 };
        monthRow.revenue += item.estimatedValue || 0; monthRow.count += 1; months.set(month, monthRow);
        const segment = item.client?.segment || "sem_segmento";
        const segmentRow = segments.get(segment) || { revenue: 0, count: 0 };
        segmentRow.revenue += item.estimatedValue || 0; segmentRow.count += 1; segments.set(segment, segmentRow);
      }
      const totalRevenue = won.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);
      res.json({ success: true, data: {
        revenueByMonth: Array.from(months.entries()).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6).map(([month, row]) => ({ month, ...row })),
        revenueBySegment: Array.from(segments.entries()).map(([segment, row]) => ({ segment, ...row })),
        avgDealSize: won.length ? totalRevenue / won.length : 0,
        winRate: totalOpps ? (won.length / totalOpps) * 100 : 0,
      } });
      return;
    }

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

export const getFinancialOverview: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const [entries, opportunities, clients] = await Promise.all([
        prisma.financialEntry.findMany({ where: { userId: owner }, include: { client: { select: { id: true, name: true, company: true } } }, orderBy: { createdAt: "desc" } }),
        prisma.opportunity.findMany({ where: { userId: owner } }),
        prisma.client.findMany({ where: { userId: owner } }),
      ]);
      const now = new Date(); const currentMonth = monthKey(now);
      const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));
      const eventDate = (entry: typeof entries[number]) => entry.paidAt || entry.dueDate || entry.createdAt;
      const sum = (items: typeof entries, predicate: (entry: typeof entries[number]) => boolean) =>
        items.reduce((total, entry) => total + (predicate(entry) ? entry.amount : 0), 0);
      const receivedMonth = sum(entries, (e) => e.kind === "income" && e.status === "settled" && monthKey(eventDate(e)) === currentMonth);
      const expensesMonth = sum(entries, (e) => e.kind === "expense" && e.status === "settled" && monthKey(eventDate(e)) === currentMonth);
      const toReceive = sum(entries, (e) => e.kind === "income" && e.status === "pending");
      const toPay = sum(entries, (e) => e.kind === "expense" && e.status === "pending");
      const fixedMonthly = sum(entries, (e) => e.kind === "expense" && e.recurrence === "monthly" && e.status !== "canceled");
      const ledgerRecurring = sum(entries, (e) => e.kind === "income" && e.recurrence === "monthly" && e.status !== "canceled");
      const overdueReceivables = sum(entries, (e) => e.kind === "income" && e.status === "pending" && Boolean(e.dueDate && e.dueDate < now));
      const lostThisMonth = opportunities.filter((o) => o.stage === "lost" && monthKey(o.updatedAt) === currentMonth).reduce((t, o) => t + (o.estimatedValue || 0), 0);
      const openStages = new Set(["prospect", "contacted", "qualified", "proposal", "negotiation", "freela"]);
      const weights: Record<string, number> = { prospect: .1, contacted: .25, qualified: .5, proposal: .7, negotiation: .85, freela: .5 };
      const crmLost = clients.filter((c) => c.workflowStage === "lost" && monthKey(c.updatedAt) === currentMonth).reduce((t, c) => t + c.totalSpent, 0);
      const crmOpen = clients.filter((c) => openStages.has(c.workflowStage));
      const crmOpenValue = crmOpen.reduce((t, c) => t + c.totalSpent, 0);
      const crmWeightedValue = crmOpen.reduce((t, c) => t + c.totalSpent * (weights[c.workflowStage] || 0), 0);
      const recurringClientIds = new Set(entries.filter((e) => e.clientId && e.kind === "income" && e.recurrence === "monthly" && e.status !== "canceled").map((e) => String(e.clientId)));
      const crmRecurring = clients.filter((c) => c.workflowStage === "recurrent" && !recurringClientIds.has(String(c.id))).reduce((t, c) => t + c.totalSpent, 0);
      clients.filter((c) => c.workflowStage === "recurrent").forEach((c) => recurringClientIds.add(String(c.id)));
      const openOpps = opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost");
      const openPipeline = openOpps.reduce((t, o) => t + (o.estimatedValue || 0), 0);
      const weightedPipeline = openOpps.reduce((t, o) => t + (o.estimatedValue || 0) * o.probability / 100, 0);
      const cashflow = new Map<string, { income: number; expenses: number }>();
      const sources = new Map<string, { amount: number; count: number }>();
      const clientRevenue = new Map<string, { id: number; name: string; company: string | null; revenue: number }>();
      for (const entry of entries) {
        if (entry.status === "settled" && eventDate(entry) >= sixMonthsAgo) {
          const key = monthKey(eventDate(entry)); const row = cashflow.get(key) || { income: 0, expenses: 0 };
          if (entry.kind === "income") row.income += entry.amount; else if (entry.kind === "expense") row.expenses += entry.amount;
          cashflow.set(key, row);
        }
        if (entry.kind === "income" && entry.status === "settled") {
          const source = sources.get(entry.category) || { amount: 0, count: 0 };
          source.amount += entry.amount; source.count += 1; sources.set(entry.category, source);
          if (entry.client) {
            const key = String(entry.client.id); const row = clientRevenue.get(key) || { id: Number(entry.client.id), name: entry.client.name, company: entry.client.company, revenue: 0 };
            row.revenue += entry.amount; clientRevenue.set(key, row);
          }
        }
      }
      const topClients = clientRevenue.size
        ? Array.from(clientRevenue.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6)
        : clients.filter((c) => c.totalSpent > 0).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 6).map((c) => ({ id: Number(c.id), name: c.name, company: c.company, revenue: c.totalSpent }));
      const pending = entries.filter((e) => e.status === "pending").sort((a, b) => {
        if (!a.dueDate) return 1; if (!b.dueDate) return -1; return a.dueDate.getTime() - b.dueDate.getTime();
      }).slice(0, 10);
      res.json({ success: true, data: {
        summary: { receivedMonth, expensesMonth, toReceive, toPay, fixedMonthly, overdueReceivables,
          profitMonth: receivedMonth - expensesMonth, lossesMonth: lostThisMonth + crmLost,
          openPipeline, weightedPipeline: Math.round(weightedPipeline), crmOpenValue,
          crmWeightedValue: Math.round(crmWeightedValue), recurringRevenue: ledgerRecurring + crmRecurring,
          recurringClients: recurringClientIds.size },
        monthlyCashflow: Array.from(cashflow.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, row]) => ({ month, ...row })),
        revenueSources: Array.from(sources.entries()).sort(([, a], [, b]) => b.amount - a.amount).slice(0, 6).map(([category, row]) => ({ category, ...row })),
        topClients, pendingEntries: pending.map(serializeFinancial), recentEntries: entries.slice(0, 12).map(serializeFinancial),
      } });
      return;
    }

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

export const createFinancialEntry: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const {
      clientId,
      opportunityId,
      projectId,
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
    const linkedClientId = normalizeOptionalId(clientId, "Cliente");
    const linkedOpportunityId = normalizeOptionalId(opportunityId, "Oportunidade");
    const linkedProjectId = normalizeOptionalId(projectId, "Projeto");

    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const prismaClientId = linkedClientId ? BigInt(linkedClientId) : null;
      const prismaOpportunityId = linkedOpportunityId ? BigInt(linkedOpportunityId) : null;
      const prismaProjectId = linkedProjectId ? BigInt(linkedProjectId) : null;
      if (prismaClientId && !(await prisma.client.findFirst({ where: { id: prismaClientId, userId: owner }, select: { id: true } }))) {
        throw new AppError("Cliente não encontrado", 404);
      }
      if (prismaOpportunityId && !(await prisma.opportunity.findFirst({ where: { id: prismaOpportunityId, userId: owner }, select: { id: true } }))) {
        throw new AppError("Oportunidade não encontrada", 404);
      }
      if (prismaProjectId && !(await prisma.project.findFirst({ where: { id: prismaProjectId, userId: owner }, select: { id: true } }))) {
        throw new AppError("Projeto não encontrado", 404);
      }
      const created = await prisma.financialEntry.create({ data: {
        userId: owner, clientId: prismaClientId, opportunityId: prismaOpportunityId, projectId: prismaProjectId, kind,
        description: description.trim(), category: category?.trim() || "geral", amount: entryAmount,
        status: nextStatus, dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: settledAt ? new Date(settledAt) : null, recurrence: nextRecurrence,
        isFixed: Boolean(isFixed), notes: notes?.trim() || null,
      } });
      res.json({ success: true, data: serializeFinancial(created) });
      return;
    }

    if (linkedClientId !== null) {
      const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(linkedClientId, userId);
      if (!client) throw new AppError("Cliente não encontrado", 404);
    }
    if (linkedOpportunityId !== null) {
      const opportunity = db.prepare("SELECT id FROM opportunities WHERE id = ? AND user_id = ?")
        .get(linkedOpportunityId, userId);
      if (!opportunity) throw new AppError("Oportunidade não encontrada", 404);
    }
    if (linkedProjectId !== null) {
      const project = db.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
        .get(linkedProjectId, userId);
      if (!project) throw new AppError("Projeto não encontrado", 404);
    }

    const result = db.prepare(`
      INSERT INTO financial_entries (
        user_id, client_id, opportunity_id, project_id, kind, description, category, amount,
        status, due_date, paid_at, recurrence, is_fixed, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      linkedClientId,
      linkedOpportunityId,
      linkedProjectId,
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

export const updateFinancialEntry: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const {
      description,
      amount,
      category,
      kind,
      dueDate,
      recurrence,
      clientId,
      opportunityId,
      projectId,
      isFixed,
      status: bodyStatus,
      paidAt: bodyPaidAt,
    } = req.body;

    if (!Number.isInteger(id) || id <= 0) throw new AppError("Lançamento inválido", 400);

    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const current = await prisma.financialEntry.findFirst({ where: { id: BigInt(id), userId: owner } });
      if (!current) throw new AppError("Lançamento não encontrado", 404);
      const status = bodyStatus ?? current.status;
      if (!FINANCIAL_STATUSES.has(String(status))) throw new AppError("Status financeiro inválido", 400);
      if (kind !== undefined && !FINANCIAL_KINDS.has(kind)) throw new AppError("Tipo de lançamento inválido", 400);
      if (recurrence !== undefined && !FINANCIAL_RECURRENCES.has(recurrence)) throw new AppError("Recorrência inválida", 400);

      const nextClientId = clientId !== undefined
        ? normalizeOptionalId(clientId, "Cliente")
        : current.clientId ? Number(current.clientId) : null;
      const nextOpportunityId = opportunityId !== undefined
        ? normalizeOptionalId(opportunityId, "Oportunidade")
        : current.opportunityId ? Number(current.opportunityId) : null;
      const nextProjectId = projectId !== undefined
        ? normalizeOptionalId(projectId, "Projeto")
        : current.projectId ? Number(current.projectId) : null;
      if (nextClientId !== null && !(await prisma.client.findFirst({
        where: { id: BigInt(nextClientId), userId: owner }, select: { id: true },
      }))) {
        throw new AppError("Cliente não encontrado", 404);
      }
      if (nextOpportunityId !== null && !(await prisma.opportunity.findFirst({
        where: { id: BigInt(nextOpportunityId), userId: owner }, select: { id: true },
      }))) {
        throw new AppError("Oportunidade não encontrada", 404);
      }
      if (nextProjectId !== null && !(await prisma.project.findFirst({
        where: { id: BigInt(nextProjectId), userId: owner }, select: { id: true },
      }))) {
        throw new AppError("Projeto não encontrado", 404);
      }

      const paidAt = status === "settled"
        ? (bodyPaidAt ? new Date(bodyPaidAt) : current.paidAt || new Date())
        : null;
      const data: Record<string, unknown> = { status, paidAt, updatedAt: new Date() };
      if (description !== undefined) data.description = description.trim();
      if (amount !== undefined) data.amount = normalizeAmount(amount);
      if (category !== undefined) data.category = category.trim();
      if (kind !== undefined) data.kind = kind;
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
      if (recurrence !== undefined) data.recurrence = recurrence;
      if (clientId !== undefined) data.clientId = nextClientId ? BigInt(nextClientId) : null;
      if (opportunityId !== undefined) data.opportunityId = nextOpportunityId ? BigInt(nextOpportunityId) : null;
      if (projectId !== undefined) data.projectId = nextProjectId ? BigInt(nextProjectId) : null;
      if (isFixed !== undefined) data.isFixed = Boolean(isFixed);
      const updated = await prisma.financialEntry.update({ where: { id: current.id }, data });
      res.json({ success: true, data: serializeFinancial(updated) });
      return;
    }

    const current = db.prepare("SELECT * FROM financial_entries WHERE id = ? AND user_id = ?")
      .get(id, userId) as Record<string, unknown> | undefined;
    if (!current) throw new AppError("Lançamento não encontrado", 404);

    const nextStatus = bodyStatus ?? current.status;
    if (!FINANCIAL_STATUSES.has(String(nextStatus))) throw new AppError("Status financeiro inválido", 400);
    if (kind !== undefined && !FINANCIAL_KINDS.has(kind)) throw new AppError("Tipo de lançamento inválido", 400);
    if (recurrence !== undefined && !FINANCIAL_RECURRENCES.has(recurrence)) throw new AppError("Recorrência inválida", 400);

    const nextClientId = clientId !== undefined
      ? normalizeOptionalId(clientId, "Cliente")
      : normalizeOptionalId(current.client_id, "Cliente");
    const nextOpportunityId = opportunityId !== undefined
      ? normalizeOptionalId(opportunityId, "Oportunidade")
      : normalizeOptionalId(current.opportunity_id, "Oportunidade");
    const nextProjectId = projectId !== undefined
      ? normalizeOptionalId(projectId, "Projeto")
      : normalizeOptionalId(current.project_id, "Projeto");
    if (nextClientId !== null) {
      const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(nextClientId, userId);
      if (!client) throw new AppError("Cliente não encontrado", 404);
    }
    if (nextOpportunityId !== null) {
      const opportunity = db.prepare("SELECT id FROM opportunities WHERE id = ? AND user_id = ?")
        .get(nextOpportunityId, userId);
      if (!opportunity) throw new AppError("Oportunidade não encontrada", 404);
    }
    if (nextProjectId !== null) {
      const project = db.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
        .get(nextProjectId, userId);
      if (!project) throw new AppError("Projeto não encontrado", 404);
    }

    const nextAmount = amount !== undefined ? normalizeAmount(amount) : null;
    const nextPaidAt = nextStatus === "settled"
      ? (bodyPaidAt || current.paid_at || new Date().toISOString().slice(0, 10))
      : null;

    db.prepare(`
      UPDATE financial_entries
      SET description = COALESCE(?, description),
          amount = COALESCE(?, amount),
          category = COALESCE(?, category),
          kind = COALESCE(?, kind),
          due_date = CASE WHEN ? = 1 THEN ? ELSE due_date END,
          recurrence = COALESCE(?, recurrence),
          client_id = CASE WHEN ? = 1 THEN ? ELSE client_id END,
          opportunity_id = CASE WHEN ? = 1 THEN ? ELSE opportunity_id END,
          project_id = CASE WHEN ? = 1 THEN ? ELSE project_id END,
          is_fixed = COALESCE(?, is_fixed),
          status = ?,
          paid_at = ?,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
      description !== undefined ? description.trim() : null,
      nextAmount,
      category !== undefined ? category.trim() : null,
      kind !== undefined ? kind : null,
      dueDate !== undefined ? 1 : 0,
      dueDate || null,
      recurrence !== undefined ? recurrence : null,
      clientId !== undefined ? 1 : 0,
      nextClientId,
      opportunityId !== undefined ? 1 : 0,
      nextOpportunityId,
      projectId !== undefined ? 1 : 0,
      nextProjectId,
      isFixed !== undefined ? (isFixed ? 1 : 0) : null,
      nextStatus,
      nextPaidAt,
      id,
      userId,
    );

    const updated = db.prepare("SELECT * FROM financial_entries WHERE id = ? AND user_id = ?")
      .get(id, userId);
    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

export const deleteFinancialEntry: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    if (shouldUsePrisma) {
      const result = await prisma.financialEntry.deleteMany({ where: { id: BigInt(id), userId: BigInt(userId) } });
      if (!result.count) throw new AppError("Lançamento não encontrado", 404);
      res.json({ success: true, data: { id } });
      return;
    }
    const result = db.prepare("DELETE FROM financial_entries WHERE id = ? AND user_id = ?")
      .run(id, userId);
    if (!result.changes) throw new AppError("Lançamento não encontrado", 404);
    res.json({ success: true, data: { id } });
  } catch (e) {
    next(e);
  }
};

// Get activity analytics
export const getActivityAnalytics: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 30;
    if (shouldUsePrisma) {
      const owner = BigInt(userId); const since = new Date(Date.now() - days * 86400000);
      const [projects, generations, interactions, files] = await Promise.all([
        prisma.project.findMany({ where: { userId: owner, createdAt: { gte: since } }, select: { createdAt: true } }),
        prisma.generation.findMany({ where: { userId: owner, createdAt: { gte: since } }, select: { createdAt: true } }),
        prisma.interaction.findMany({ where: { userId: owner, createdAt: { gte: since } }, select: { createdAt: true } }),
        prisma.file.findMany({ where: { userId: owner, createdAt: { gte: since } }, select: { createdAt: true } }),
      ]);
      const daysMap = new Map<string, number>();
      for (const item of [...projects, ...generations, ...interactions, ...files]) {
        const day = item.createdAt.toISOString().slice(0, 10); daysMap.set(day, (daysMap.get(day) || 0) + 1);
      }
      res.json({ success: true, data: {
        recentProjects: projects.length, recentGenerations: generations.length,
        recentInteractions: interactions.length, recentFiles: files.length,
        activityByDay: Array.from(daysMap.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([day, count]) => ({ day, count })),
      } });
      return;
    }

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


// ===============================================
// ANALYTICS PREMIUM - DASHBOARDS
// ===============================================

// Get all dashboards for the user
export const getDashboards: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    const dashboards = await prisma.dashboard.findMany({
      where: { userId: BigInt(userId) },
      include: {
        _count: {
          select: { widgets: true }
        }
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    res.json({
      success: true,
      data: dashboards.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description,
        layout: d.layout,
        is_default: d.isDefault,
        is_shared: d.isShared,
        widget_count: d._count.widgets,
        created_at: d.createdAt,
        updated_at: d.updatedAt
      }))
    });
  } catch (e) {
    next(e);
  }
};

// Create a new dashboard
export const createDashboard: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, description, isDefault } = req.body;

    if (!name?.trim()) {
      throw new AppError("Dashboard name is required", 400);
    }

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.dashboard.updateMany({
        where: { userId: BigInt(userId), isDefault: true },
        data: { isDefault: false }
      });
    }

    const dashboard = await prisma.dashboard.create({
      data: {
        userId: BigInt(userId),
        name: name.trim(),
        description: description?.trim() || null,
        isDefault: Boolean(isDefault),
        layout: { cols: 12, rowHeight: 80, widgets: [] }
      }
    });

    res.json({
      success: true,
      data: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        layout: dashboard.layout,
        is_default: dashboard.isDefault,
        is_shared: dashboard.isShared,
        created_at: dashboard.createdAt,
        updated_at: dashboard.updatedAt
      }
    });
  } catch (e) {
    next(e);
  }
};

// Get a specific dashboard with widgets
export const getDashboard: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    const dashboard = await prisma.dashboard.findFirst({
      where: {
        id,
        userId: BigInt(userId)
      },
      include: {
        widgets: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!dashboard) {
      throw new AppError("Dashboard not found", 404);
    }

    res.json({
      success: true,
      data: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        layout: dashboard.layout,
        is_default: dashboard.isDefault,
        is_shared: dashboard.isShared,
        widgets: dashboard.widgets.map(w => ({
          id: w.id,
          type: w.type,
          title: w.title,
          data_source: w.dataSource,
          config: w.config,
          position: w.position,
          created_at: w.createdAt,
          updated_at: w.updatedAt
        })),
        created_at: dashboard.createdAt,
        updated_at: dashboard.updatedAt
      }
    });
  } catch (e) {
    next(e);
  }
};

// Update a dashboard
export const updateDashboard: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, description, layout, isDefault } = req.body;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    const existing = await prisma.dashboard.findFirst({
      where: { id, userId: BigInt(userId) }
    });

    if (!existing) {
      throw new AppError("Dashboard not found", 404);
    }

    // If setting as default, unset other defaults
    if (isDefault && !existing.isDefault) {
      await prisma.dashboard.updateMany({
        where: { userId: BigInt(userId), isDefault: true },
        data: { isDefault: false }
      });
    }

    const dashboard = await prisma.dashboard.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        description: description !== undefined ? (description?.trim() || null) : existing.description,
        layout: layout || existing.layout,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : existing.isDefault,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description,
        layout: dashboard.layout,
        is_default: dashboard.isDefault,
        is_shared: dashboard.isShared,
        created_at: dashboard.createdAt,
        updated_at: dashboard.updatedAt
      }
    });
  } catch (e) {
    next(e);
  }
};

// Delete a dashboard
export const deleteDashboard: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    const result = await prisma.dashboard.deleteMany({
      where: { id, userId: BigInt(userId) }
    });

    if (!result.count) {
      throw new AppError("Dashboard not found", 404);
    }

    res.json({ success: true, data: { id } });
  } catch (e) {
    next(e);
  }
};


// ===============================================
// ANALYTICS PREMIUM - WIDGETS
// ===============================================

const WIDGET_TYPES = new Set(['kpi', 'lineChart', 'barChart', 'pieChart', 'table', 'funnel', 'heatmap', 'gauge']);
const DATA_SOURCES = new Set(['tickets', 'revenue', 'users', 'proposals', 'opportunities', 'projects', 'clients']);

// Add a widget to a dashboard
export const createWidget: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { dashboardId, type, title, dataSource, config, position } = req.body;

    if (!dashboardId || !type || !title || !dataSource) {
      throw new AppError("Required fields: dashboardId, type, title, dataSource", 400);
    }

    if (!WIDGET_TYPES.has(type)) {
      throw new AppError(`Invalid widget type. Must be one of: ${Array.from(WIDGET_TYPES).join(', ')}`, 400);
    }

    if (!DATA_SOURCES.has(dataSource)) {
      throw new AppError(`Invalid data source. Must be one of: ${Array.from(DATA_SOURCES).join(', ')}`, 400);
    }

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    // Verify dashboard ownership
    const dashboard = await prisma.dashboard.findFirst({
      where: { id: dashboardId, userId: BigInt(userId) }
    });

    if (!dashboard) {
      throw new AppError("Dashboard not found", 404);
    }

    const widget = await prisma.widget.create({
      data: {
        dashboardId,
        type,
        title: title.trim(),
        dataSource,
        config: config || {},
        position: position || { x: 0, y: 0, w: 4, h: 3 }
      }
    });

    res.json({
      success: true,
      data: {
        id: widget.id,
        dashboard_id: widget.dashboardId,
        type: widget.type,
        title: widget.title,
        data_source: widget.dataSource,
        config: widget.config,
        position: widget.position,
        created_at: widget.createdAt,
        updated_at: widget.updatedAt
      }
    });
  } catch (e) {
    next(e);
  }
};

// Update a widget
export const updateWidget: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, config, position } = req.body;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    // Verify ownership through dashboard
    const existing = await prisma.widget.findFirst({
      where: { id },
      include: { dashboard: true }
    });

    if (!existing || existing.dashboard.userId !== BigInt(userId)) {
      throw new AppError("Widget not found", 404);
    }

    const widget = await prisma.widget.update({
      where: { id },
      data: {
        title: title?.trim() || existing.title,
        config: config !== undefined ? config : existing.config,
        position: position !== undefined ? position : existing.position,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        id: widget.id,
        dashboard_id: widget.dashboardId,
        type: widget.type,
        title: widget.title,
        data_source: widget.dataSource,
        config: widget.config,
        position: widget.position,
        created_at: widget.createdAt,
        updated_at: widget.updatedAt
      }
    });
  } catch (e) {
    next(e);
  }
};

// Delete a widget
export const deleteWidget: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    // Verify ownership through dashboard
    const widget = await prisma.widget.findFirst({
      where: { id },
      include: { dashboard: true }
    });

    if (!widget || widget.dashboard.userId !== BigInt(userId)) {
      throw new AppError("Widget not found", 404);
    }

    await prisma.widget.delete({ where: { id } });

    res.json({ success: true, data: { id } });
  } catch (e) {
    next(e);
  }
};

// Get widget data (this will be expanded with actual data mappers)
export const getWidgetDataHandler: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    // Verify ownership
    const widget = await prisma.widget.findFirst({
      where: { id },
      include: { dashboard: true }
    });

    if (!widget || widget.dashboard.userId !== BigInt(userId)) {
      throw new AppError("Widget not found", 404);
    }

    // Get real data using data mappers
    const data = await getWidgetData(
      widget.type,
      widget.dataSource,
      BigInt(userId),
      widget.config
    );

    res.json({
      success: true,
      data
    });
  } catch (e) {
    next(e);
  }
};


// ===============================================
// ANALYTICS PREMIUM - REPORTS
// ===============================================

const REPORT_TYPES = new Set(['sales', 'productivity', 'pipeline', 'roi', 'health']);

// Get all reports for the user
export const getReports: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    const reports = await prisma.report.findMany({
      where: { userId: BigInt(userId) },
      include: {
        _count: {
          select: { executions: true }
        },
        executions: {
          take: 1,
          orderBy: { executedAt: 'desc' },
          select: {
            id: true,
            status: true,
            executedAt: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      success: true,
      data: reports.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        filters: r.filters,
        schedule: r.schedule,
        last_run: r.lastRun,
        execution_count: r._count.executions,
        last_execution: r.executions[0] || null,
        created_at: r.createdAt,
        updated_at: r.updatedAt
      }))
    });
  } catch (e) {
    next(e);
  }
};

// Create a new report
export const createReport: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, type, filters, schedule } = req.body;

    if (!name?.trim()) {
      throw new AppError("Report name is required", 400);
    }

    if (!type || !REPORT_TYPES.has(type)) {
      throw new AppError(`Invalid report type. Must be one of: ${Array.from(REPORT_TYPES).join(', ')}`, 400);
    }

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    const report = await prisma.report.create({
      data: {
        userId: BigInt(userId),
        name: name.trim(),
        type,
        filters: filters || {},
        schedule: schedule || null
      }
    });

    res.json({
      success: true,
      data: {
        id: report.id,
        name: report.name,
        type: report.type,
        filters: report.filters,
        schedule: report.schedule,
        last_run: report.lastRun,
        created_at: report.createdAt,
        updated_at: report.updatedAt
      }
    });
  } catch (e) {
    next(e);
  }
};

// Get a specific report
export const getReport: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    const report = await prisma.report.findFirst({
      where: { id, userId: BigInt(userId) },
      include: {
        executions: {
          orderBy: { executedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!report) {
      throw new AppError("Report not found", 404);
    }

    res.json({
      success: true,
      data: {
        id: report.id,
        name: report.name,
        type: report.type,
        filters: report.filters,
        schedule: report.schedule,
        last_run: report.lastRun,
        executions: report.executions.map(e => ({
          id: e.id,
          status: e.status,
          file_url: e.fileUrl,
          error: e.error,
          executed_at: e.executedAt
        })),
        created_at: report.createdAt,
        updated_at: report.updatedAt
      }
    });
  } catch (e) {
    next(e);
  }
};

// Update a report
export const updateReport: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, filters, schedule } = req.body;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    const existing = await prisma.report.findFirst({
      where: { id, userId: BigInt(userId) }
    });

    if (!existing) {
      throw new AppError("Report not found", 404);
    }

    const report = await prisma.report.update({
      where: { id },
      data: {
        name: name?.trim() || existing.name,
        filters: filters !== undefined ? filters : existing.filters,
        schedule: schedule !== undefined ? schedule : existing.schedule,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: {
        id: report.id,
        name: report.name,
        type: report.type,
        filters: report.filters,
        schedule: report.schedule,
        last_run: report.lastRun,
        created_at: report.createdAt,
        updated_at: report.updatedAt
      }
    });
  } catch (e) {
    next(e);
  }
};

// Delete a report
export const deleteReport: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    const result = await prisma.report.deleteMany({
      where: { id, userId: BigInt(userId) }
    });

    if (!result.count) {
      throw new AppError("Report not found", 404);
    }

    res.json({ success: true, data: { id } });
  } catch (e) {
    next(e);
  }
};

// Build the date range filter (report.filters.startDate/endDate) shared by report types
function reportDateRange(filters: any): { gte?: Date; lte?: Date } | undefined {
  const range: { gte?: Date; lte?: Date } = {};
  if (filters?.startDate) {
    const start = new Date(filters.startDate);
    if (!Number.isNaN(start.getTime())) range.gte = start;
  }
  if (filters?.endDate) {
    const end = new Date(filters.endDate);
    if (!Number.isNaN(end.getTime())) range.lte = end;
  }
  return range.gte || range.lte ? range : undefined;
}

// Compute real report data for each supported report type, reusing the same
// Prisma queries the analytics dashboards already rely on.
async function computeReportResult(owner: bigint, type: string, filters: any) {
  const createdAt = reportDateRange(filters);

  if (type === "sales") {
    const wonWhere: any = { userId: owner, stage: "won" };
    if (createdAt) wonWhere.createdAt = createdAt;
    const totalOppsWhere: any = { userId: owner };
    if (createdAt) totalOppsWhere.createdAt = createdAt;

    const [won, totalOpps] = await Promise.all([
      prisma.opportunity.findMany({ where: wonWhere, include: { client: { select: { segment: true } } } }),
      prisma.opportunity.count({ where: totalOppsWhere }),
    ]);

    const months = new Map<string, { revenue: number; count: number }>();
    const segments = new Map<string, { revenue: number; count: number }>();
    for (const item of won) {
      const month = monthKey(item.createdAt);
      const monthRow = months.get(month) || { revenue: 0, count: 0 };
      monthRow.revenue += item.estimatedValue || 0; monthRow.count += 1; months.set(month, monthRow);
      const segment = item.client?.segment || "sem_segmento";
      const segmentRow = segments.get(segment) || { revenue: 0, count: 0 };
      segmentRow.revenue += item.estimatedValue || 0; segmentRow.count += 1; segments.set(segment, segmentRow);
    }
    const totalRevenue = won.reduce((sum, item) => sum + (item.estimatedValue || 0), 0);

    return {
      total_records: won.length,
      total_revenue: totalRevenue,
      avg_deal_size: won.length ? totalRevenue / won.length : 0,
      win_rate: totalOpps ? (won.length / totalOpps) * 100 : 0,
      revenue_by_month: Array.from(months.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([month, row]) => ({ month, ...row })),
      revenue_by_segment: Array.from(segments.entries()).map(([segment, row]) => ({ segment, ...row })),
    };
  }

  if (type === "productivity") {
    const days = Number(filters?.days) > 0 ? Number(filters.days) : 30;
    const since = createdAt?.gte || new Date(Date.now() - days * 86400000);
    const until = createdAt?.lte;
    const withinRange = (date: Date) => date >= since && (!until || date <= until);

    const [projects, generations, interactions, files] = await Promise.all([
      prisma.project.findMany({ where: { userId: owner, createdAt: { gte: since, ...(until ? { lte: until } : {}) } }, select: { createdAt: true } }),
      prisma.generation.findMany({ where: { userId: owner, createdAt: { gte: since, ...(until ? { lte: until } : {}) } }, select: { createdAt: true } }),
      prisma.interaction.findMany({ where: { userId: owner, createdAt: { gte: since, ...(until ? { lte: until } : {}) } }, select: { createdAt: true } }),
      prisma.file.findMany({ where: { userId: owner, createdAt: { gte: since, ...(until ? { lte: until } : {}) } }, select: { createdAt: true } }),
    ]);
    const daysMap = new Map<string, number>();
    for (const item of [...projects, ...generations, ...interactions, ...files]) {
      if (!withinRange(item.createdAt)) continue;
      const day = item.createdAt.toISOString().slice(0, 10);
      daysMap.set(day, (daysMap.get(day) || 0) + 1);
    }

    return {
      total_records: projects.length + generations.length + interactions.length + files.length,
      recent_projects: projects.length,
      recent_generations: generations.length,
      recent_interactions: interactions.length,
      recent_files: files.length,
      activity_by_day: Array.from(daysMap.entries()).sort(([a], [b]) => b.localeCompare(a)).map(([day, count]) => ({ day, count })),
    };
  }

  if (type === "pipeline") {
    const where: any = { userId: owner };
    if (createdAt) where.createdAt = createdAt;
    if (filters?.stage && filters.stage !== "all") where.stage = filters.stage;

    const opportunities = await prisma.opportunity.findMany({ where });
    const byStage = new Map<string, { count: number; value: number }>();
    for (const opp of opportunities) {
      const row = byStage.get(opp.stage) || { count: 0, value: 0 };
      row.count += 1; row.value += opp.estimatedValue || 0; byStage.set(opp.stage, row);
    }
    const openOpps = opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost");
    const openPipeline = openOpps.reduce((t, o) => t + (o.estimatedValue || 0), 0);
    const weightedPipeline = openOpps.reduce((t, o) => t + (o.estimatedValue || 0) * o.probability / 100, 0);

    return {
      total_records: opportunities.length,
      open_pipeline_value: openPipeline,
      weighted_pipeline_value: Math.round(weightedPipeline),
      by_stage: Array.from(byStage.entries()).map(([stage, row]) => ({ stage, ...row })),
    };
  }

  if (type === "roi") {
    const where: any = { userId: owner, status: "settled" };
    if (createdAt) where.createdAt = createdAt;
    const entries = await prisma.financialEntry.findMany({ where });
    const totalIncome = entries.filter((e) => e.kind === "income").reduce((t, e) => t + e.amount, 0);
    const totalExpense = entries.filter((e) => e.kind === "expense").reduce((t, e) => t + e.amount, 0);
    const roi = totalExpense > 0 ? ((totalIncome - totalExpense) / totalExpense) * 100 : null;

    return {
      total_records: entries.length,
      total_income: totalIncome,
      total_expense: totalExpense,
      net_profit: totalIncome - totalExpense,
      roi_percent: roi,
    };
  }

  // health: composite snapshot of the business, same data as the overall analytics widget
  const start = createdAt?.gte;
  const wonFilter: any = { userId: owner, stage: "won" };
  if (createdAt) wonFilter.createdAt = createdAt;
  else { const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0); wonFilter.createdAt = { gte: monthStart }; }

  const [totalProjects, activeProjects, totalClients, clientValue, totalOpportunities, pipeline, won, generations] = await Promise.all([
    prisma.project.count({ where: { userId: owner, ...(start ? { createdAt } : {}) } }),
    prisma.project.count({ where: { userId: owner, status: "active" } }),
    prisma.client.count({ where: { userId: owner } }),
    prisma.client.aggregate({ where: { userId: owner }, _sum: { totalSpent: true } }),
    prisma.opportunity.count({ where: { userId: owner, ...(createdAt ? { createdAt } : {}) } }),
    prisma.opportunity.aggregate({ where: { userId: owner, stage: { not: "lost" } }, _sum: { estimatedValue: true } }),
    prisma.opportunity.aggregate({ where: wonFilter, _sum: { estimatedValue: true } }),
    prisma.generation.count({ where: { userId: owner, ...(createdAt ? { createdAt } : {}) } }),
  ]);

  return {
    total_records: totalProjects + totalClients + totalOpportunities,
    projects: { total: totalProjects, active: activeProjects },
    clients: { total: totalClients, total_value: clientValue._sum.totalSpent || 0 },
    pipeline: { total_opportunities: totalOpportunities, pipeline_value: pipeline._sum.estimatedValue || 0, won_value: won._sum.estimatedValue || 0 },
    ai: { total_generations: generations },
  };
}

// Execute a report (generate real data based on the report's saved type/filters)
export const runReport: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    const report = await prisma.report.findFirst({
      where: { id, userId: BigInt(userId) }
    });

    if (!report) {
      throw new AppError("Report not found", 404);
    }

    // Create execution record
    const execution = await prisma.reportExecution.create({
      data: {
        reportId: report.id,
        status: 'pending'
      }
    });

    let completed;
    try {
      const summary = await computeReportResult(BigInt(userId), report.type, report.filters);
      const result = {
        generated_at: new Date().toISOString(),
        report_type: report.type,
        summary,
      };
      completed = await prisma.reportExecution.update({
        where: { id: execution.id },
        data: { status: 'completed', result },
      });
    } catch (genError) {
      completed = await prisma.reportExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          error: genError instanceof Error ? genError.message : "Failed to generate report",
        },
      });
    }

    // Update report lastRun
    await prisma.report.update({
      where: { id: report.id },
      data: { lastRun: new Date() }
    });

    if (completed.status === 'failed') {
      throw new AppError(completed.error || "Failed to generate report", 500);
    }

    res.json({
      success: true,
      data: {
        execution_id: completed.id,
        status: completed.status,
        result: completed.result,
        executed_at: completed.executedAt
      }
    });
  } catch (e) {
    next(e);
  }
};

// Get report execution history
export const getReportExecutions: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    if (!shouldUsePrisma) {
      throw new AppError("Analytics Premium requires PostgreSQL", 500);
    }

    // Verify report ownership
    const report = await prisma.report.findFirst({
      where: { id, userId: BigInt(userId) }
    });

    if (!report) {
      throw new AppError("Report not found", 404);
    }

    const executions = await prisma.reportExecution.findMany({
      where: { reportId: report.id },
      orderBy: { executedAt: 'desc' },
      take: 20
    });

    res.json({
      success: true,
      data: executions.map(e => ({
        id: e.id,
        status: e.status,
        result: e.result,
        file_url: e.fileUrl,
        error: e.error,
        executed_at: e.executedAt
      }))
    });
  } catch (e) {
    next(e);
  }
};
