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
    dueDate: "due_date", paidAt: "paid_at", isFixed: "is_fixed",
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

// Get overall analytics for the user
export const getOverallAnalytics: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const start = new Date(); start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
      const [totalProjects, activeProjects, totalClients, clientValue, totalOpportunities, pipeline, won, generations, collaborators] = await Promise.all([
        prisma.project.count({ where: { userId: owner } }), prisma.project.count({ where: { userId: owner, status: "active" } }),
        prisma.client.count({ where: { userId: owner } }), prisma.client.aggregate({ where: { userId: owner }, _sum: { totalSpent: true } }),
        prisma.opportunity.count({ where: { userId: owner } }), prisma.opportunity.aggregate({ where: { userId: owner, stage: { not: "lost" } }, _sum: { estimatedValue: true } }),
        prisma.opportunity.aggregate({ where: { userId: owner, stage: "won", createdAt: { gte: start } }, _sum: { estimatedValue: true } }),
        prisma.generation.count({ where: { userId: owner } }), prisma.collaborator.count({ where: { userId: owner } }),
      ]);
      res.json({ success: true, data: {
        projects: { total: totalProjects, active: activeProjects },
        clients: { total: totalClients, totalValue: clientValue._sum.totalSpent || 0 },
        pipeline: { totalOpportunities, pipelineValue: pipeline._sum.estimatedValue || 0, wonThisMonth: won._sum.estimatedValue || 0 },
        ai: { totalGenerations: generations }, team: { totalCollaborators: collaborators },
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

    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const linkedClientId = clientId ? BigInt(Number(clientId)) : null;
      const linkedOpportunityId = opportunityId ? BigInt(Number(opportunityId)) : null;
      if (linkedClientId && !(await prisma.client.findFirst({ where: { id: linkedClientId, userId: owner }, select: { id: true } }))) {
        throw new AppError("Cliente não encontrado", 404);
      }
      if (linkedOpportunityId && !(await prisma.opportunity.findFirst({ where: { id: linkedOpportunityId, userId: owner }, select: { id: true } }))) {
        throw new AppError("Oportunidade não encontrada", 404);
      }
      const created = await prisma.financialEntry.create({ data: {
        userId: owner, clientId: linkedClientId, opportunityId: linkedOpportunityId, kind,
        description: description.trim(), category: category?.trim() || "geral", amount: entryAmount,
        status: nextStatus, dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: settledAt ? new Date(settledAt) : null, recurrence: nextRecurrence,
        isFixed: Boolean(isFixed), notes: notes?.trim() || null,
      } });
      res.json({ success: true, data: serializeFinancial(created) });
      return;
    }

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

export const updateFinancialEntry: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const { description, amount, category, kind, dueDate, recurrence, clientId, isFixed, status: bodyStatus, paidAt: bodyPaidAt } = req.body;

    if (shouldUsePrisma) {
      const current = await prisma.financialEntry.findFirst({ where: { id: BigInt(id), userId: BigInt(userId) } });
      if (!current) throw new AppError("Lançamento não encontrado", 404);
      const status = bodyStatus ?? current.status;
      if (!FINANCIAL_STATUSES.has(String(status))) throw new AppError("Status financeiro inválido", 400);
      if (kind !== undefined && !FINANCIAL_KINDS.has(kind)) throw new AppError("Tipo de lançamento inválido", 400);
      if (recurrence !== undefined && !FINANCIAL_RECURRENCES.has(recurrence)) throw new AppError("Recorrência inválida", 400);
      const paidAt = status === "settled" ? (bodyPaidAt ? new Date(bodyPaidAt) : current.paidAt || new Date()) : null;
      const data: Record<string, unknown> = { status, paidAt, updatedAt: new Date() };
      if (description !== undefined) data.description = description.trim();
      if (amount !== undefined) data.amount = normalizeAmount(amount);
      if (category !== undefined) data.category = category.trim();
      if (kind !== undefined) data.kind = kind;
      if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
      if (recurrence !== undefined) data.recurrence = recurrence;
      if (clientId !== undefined) data.clientId = clientId ? BigInt(Number(clientId)) : null;
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

    const nextAmount = amount !== undefined ? normalizeAmount(amount) : undefined;
    const nextPaidAt = nextStatus === "settled"
      ? (bodyPaidAt || current.paid_at || new Date().toISOString().slice(0, 10))
      : null;

    db.prepare(`
      UPDATE financial_entries
      SET description = COALESCE(?, description),
          amount = COALESCE(?, amount),
          category = COALESCE(?, category),
          kind = COALESCE(?, kind),
          due_date = COALESCE(?, due_date),
          recurrence = COALESCE(?, recurrence),
          client_id = ?,
          is_fixed = COALESCE(?, is_fixed),
          status = COALESCE(?, status),
          paid_at = CASE WHEN ? = 'settled' THEN COALESCE(?, datetime('now')) ELSE paid_at END,
          updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
      description !== undefined ? description.trim() : null,
      nextAmount !== undefined ? nextAmount : null,
      category !== undefined ? category.trim() : null,
      kind !== undefined ? kind : null,
      dueDate !== undefined ? (dueDate || null) : null,
      recurrence !== undefined ? recurrence : null,
      clientId !== undefined ? (clientId || null) : current.client_id,
      isFixed !== undefined ? (isFixed ? 1 : 0) : null,
      nextStatus,
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

// Execute a report (generate data)
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

    // TODO: Implement actual report generation in background
    // For now, immediately mark as completed with mock data
    const mockResult = {
      generated_at: new Date().toISOString(),
      report_type: report.type,
      summary: {
        total_records: 0,
        date_range: report.filters
      }
    };

    const completed = await prisma.reportExecution.update({
      where: { id: execution.id },
      data: {
        status: 'completed',
        result: mockResult
      }
    });

    // Update report lastRun
    await prisma.report.update({
      where: { id: report.id },
      data: { lastRun: new Date() }
    });

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
