import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbOpportunity, DbCount, DbSum } from "../models/types.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

function opportunityIdValue(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError("Oportunidade inválida", 400);
  return BigInt(parsed);
}

function serializeOpportunity(value: any) {
  const result = withSnakeCase(value, {
    userId: "user_id", clientId: "client_id", estimatedValue: "estimated_value",
    expectedCloseDate: "expected_close_date", lostReason: "lost_reason",
    createdAt: "created_at", updatedAt: "updated_at",
  }) as any;
  if (result.client) {
    result.client_name = result.client.name;
    result.client_company = result.client.company;
    delete result.client;
  }
  return result;
}

// List all opportunities for current user
export const listOpportunities: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { stage, clientId } = req.query;

    if (shouldUsePrisma) {
      const rows = await prisma.opportunity.findMany({
        where: {
          userId: BigInt(userId),
          ...(stage ? { stage: String(stage) } : {}),
          ...(clientId ? { clientId: BigInt(Number(clientId)) } : {}),
        },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { updatedAt: "desc" },
      });
      res.json({ success: true, data: rows.map(serializeOpportunity) });
      return;
    }

    let query = `
      SELECT o.*, c.name as client_name, c.company as client_company
      FROM opportunities o
      LEFT JOIN clients c ON o.client_id = c.id
      WHERE o.user_id = ?
    `;
    const params: any[] = [userId];

    if (stage) {
      query += " AND o.stage = ?";
      params.push(stage);
    }

    if (clientId) {
      query += " AND o.client_id = ?";
      params.push(clientId);
    }

    query += " ORDER BY o.updated_at DESC";

    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

// Get specific opportunity
export const getOpportunity: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const opportunityId = req.params.id;

    if (shouldUsePrisma) {
      const opportunity = await prisma.opportunity.findFirst({
        where: { id: opportunityIdValue(opportunityId), userId: BigInt(userId) },
        include: { client: { select: { name: true, company: true } }, interactions: { orderBy: { createdAt: "desc" } } },
      });
      if (!opportunity) throw new AppError("Oportunidade não encontrada ou acesso não autorizado", 404);
      const { interactions, ...record } = opportunity;
      res.json({
        success: true,
        data: {
          opportunity: serializeOpportunity(record),
          interactions: interactions.map((item) => withSnakeCase(item as any, {
            userId: "user_id", clientId: "client_id", opportunityId: "opportunity_id",
            nextFollowUp: "next_follow_up", createdAt: "created_at",
          })),
        },
      });
      return;
    }

    const opportunity = db
      .prepare(
        `SELECT o.*, c.name as client_name, c.company as client_company
         FROM opportunities o
         LEFT JOIN clients c ON o.client_id = c.id
         WHERE o.id = ? AND o.user_id = ?`,
      )
      .get(opportunityId, userId);

    if (!opportunity) {
      throw new AppError("Oportunidade não encontrada ou acesso não autorizado", 404);
    }

    // Get interactions for this opportunity
    const interactions = db
      .prepare("SELECT * FROM interactions WHERE opportunity_id = ? ORDER BY created_at DESC")
      .all(opportunityId);

    res.json({
      success: true,
      data: {
        opportunity,
        interactions: interactions || [],
      },
    });
  } catch (e) {
    next(e);
  }
};

// Create a new opportunity
export const createOpportunity: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { clientId, title, stage, estimatedValue, probability, expectedCloseDate } = req.body;

    if (!title || !title.trim()) {
      throw new AppError("O título da oportunidade é obrigatório", 400);
    }

    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const linkedClientId = clientId ? BigInt(Number(clientId)) : null;
      if (linkedClientId) {
        const client = await prisma.client.findFirst({ where: { id: linkedClientId, userId: owner }, select: { id: true } });
        if (!client) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
      }
      const created = await prisma.opportunity.create({
        data: {
          userId: owner, clientId: linkedClientId, title: title.trim(), stage: stage || "prospect",
          estimatedValue: estimatedValue != null ? Number(estimatedValue) : null,
          probability: probability != null ? Number(probability) : 50,
          expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
        },
      });
      res.json({ success: true, data: serializeOpportunity(created) });
      return;
    }

    const result = db
      .prepare(
        `INSERT INTO opportunities (user_id, client_id, title, stage, estimated_value, probability, expected_close_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        clientId || null,
        title.trim(),
        stage || "prospect",
        estimatedValue || null,
        probability || 50,
        expectedCloseDate || null,
      );

    const newOpportunity = db.prepare("SELECT * FROM opportunities WHERE id = ?").get(result.lastInsertRowid);

    res.json({ success: true, data: newOpportunity });
  } catch (e) {
    next(e);
  }
};

// Update opportunity (move stage, update details)
export const updateOpportunity: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const opportunityId = req.params.id;
    const { title, stage, estimatedValue, probability, expectedCloseDate, lostReason } = req.body;

    if (shouldUsePrisma) {
      const id = opportunityIdValue(opportunityId);
      const opportunity = await prisma.opportunity.findFirst({ where: { id, userId: BigInt(userId) } });
      if (!opportunity) throw new AppError("Oportunidade não encontrada ou acesso não autorizado", 404);
      const updated = await prisma.opportunity.update({
        where: { id },
        data: {
          title: title?.trim() ?? opportunity.title, stage: stage ?? opportunity.stage,
          estimatedValue: estimatedValue !== undefined ? Number(estimatedValue) : opportunity.estimatedValue,
          probability: probability !== undefined ? Number(probability) : opportunity.probability,
          expectedCloseDate: expectedCloseDate !== undefined
            ? expectedCloseDate ? new Date(expectedCloseDate) : null
            : opportunity.expectedCloseDate,
          lostReason: lostReason ?? opportunity.lostReason, updatedAt: new Date(),
        },
      });
      res.json({ success: true, data: serializeOpportunity(updated) });
      return;
    }

    const opportunity = db
      .prepare("SELECT * FROM opportunities WHERE id = ? AND user_id = ?")
      .get(opportunityId, userId) as DbOpportunity | undefined;

    if (!opportunity) {
      throw new AppError("Oportunidade não encontrada ou acesso não autorizado", 404);
    }

    db.prepare(
      `UPDATE opportunities SET
        title = ?,
        stage = ?,
        estimated_value = ?,
        probability = ?,
        expected_close_date = ?,
        lost_reason = ?,
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?`,
    ).run(
      title?.trim() ?? opportunity.title,
      stage ?? opportunity.stage,
      estimatedValue !== undefined ? estimatedValue : opportunity.estimated_value,
      probability !== undefined ? probability : opportunity.probability,
      expectedCloseDate ?? opportunity.expected_close_date,
      lostReason ?? opportunity.lost_reason,
      opportunityId,
      userId,
    );

    const updated = db.prepare("SELECT * FROM opportunities WHERE id = ?").get(opportunityId);

    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

// Delete opportunity
export const deleteOpportunity: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const opportunityId = req.params.id;

    if (shouldUsePrisma) {
      const result = await prisma.opportunity.deleteMany({
        where: { id: opportunityIdValue(opportunityId), userId: BigInt(userId) },
      });
      if (result.count === 0) throw new AppError("Oportunidade não encontrada ou acesso não autorizado", 404);
      res.json({ success: true, data: { id: Number(opportunityId) } });
      return;
    }

    const result = db.prepare("DELETE FROM opportunities WHERE id = ? AND user_id = ?").run(opportunityId, userId);

    if (result.changes === 0) {
      throw new AppError("Oportunidade não encontrada ou acesso não autorizado", 404);
    }

    res.json({ success: true, data: { id: Number(opportunityId) } });
  } catch (e) {
    next(e);
  }
};

// Get pipeline statistics
export const getPipelineStats: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const monthStart = new Date();
      monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
      const [totalOpportunities, total, grouped, won] = await Promise.all([
        prisma.opportunity.count({ where: { userId: owner } }),
        prisma.opportunity.aggregate({ where: { userId: owner, stage: { not: "lost" } }, _sum: { estimatedValue: true } }),
        prisma.opportunity.groupBy({
          by: ["stage"], where: { userId: owner, stage: { not: "lost" } },
          _count: { _all: true }, _sum: { estimatedValue: true },
        }),
        prisma.opportunity.aggregate({
          where: { userId: owner, stage: "won", createdAt: { gte: monthStart } },
          _count: { _all: true }, _sum: { estimatedValue: true },
        }),
      ]);
      res.json({ success: true, data: {
        totalOpportunities, totalPipelineValue: total._sum.estimatedValue || 0,
        byStage: grouped.map((item) => ({ stage: item.stage, count: item._count._all, value: item._sum.estimatedValue || 0 })),
        wonThisMonth: { count: won._count._all, value: won._sum.estimatedValue || 0 },
      } });
      return;
    }

    const totalOpportunities = db.prepare("SELECT COUNT(*) as c FROM opportunities WHERE user_id = ?").get(userId) as DbCount;
    const totalValue = db.prepare("SELECT COALESCE(SUM(estimated_value), 0) as s FROM opportunities WHERE user_id = ? AND stage != 'lost'").get(userId) as DbSum;

    // By stage
    const byStage = db
      .prepare(
        `SELECT stage, COUNT(*) as count, COALESCE(SUM(estimated_value), 0) as value
         FROM opportunities
         WHERE user_id = ? AND stage != 'lost'
         GROUP BY stage`,
      )
      .all(userId);

    // Won this month
    const wonThisMonth = db
      .prepare(
        `SELECT COUNT(*) as c, COALESCE(SUM(estimated_value), 0) as s
         FROM opportunities
         WHERE user_id = ? AND stage = 'won'
         AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      )
      .get(userId) as DbCount & DbSum;

    res.json({
      success: true,
      data: {
        totalOpportunities: totalOpportunities.c,
        totalPipelineValue: totalValue.s,
        byStage,
        wonThisMonth: {
          count: wonThisMonth.c,
          value: wonThisMonth.s,
        },
      },
    });
  } catch (e) {
    next(e);
  }
};
