import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbCountByCount } from "../models/types.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

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
    if (shouldUsePrisma) {
      const current = await prisma.financialEntry.findFirst({ where: { id: BigInt(id), userId: BigInt(userId) } });
      if (!current) throw new AppError("Lançamento não encontrado", 404);
      const status = req.body.status ?? current.status;
      if (!FINANCIAL_STATUSES.has(String(status))) throw new AppError("Status financeiro inválido", 400);
      const paidAt = status === "settled" ? (req.body.paidAt ? new Date(req.body.paidAt) : current.paidAt || new Date()) : null;
      const updated = await prisma.financialEntry.update({ where: { id: current.id }, data: { status, paidAt, updatedAt: new Date() } });
      res.json({ success: true, data: serializeFinancial(updated) });
      return;
    }
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
