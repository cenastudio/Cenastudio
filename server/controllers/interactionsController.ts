import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbInteraction } from "../models/types.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

function interactionIdValue(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError("Interação inválida", 400);
  return BigInt(parsed);
}

function serializeInteraction(value: any) {
  const result = withSnakeCase(value, {
    userId: "user_id", clientId: "client_id", opportunityId: "opportunity_id",
    nextFollowUp: "next_follow_up", createdAt: "created_at",
  }) as any;
  if (result.client) {
    result.client_name = result.client.name;
    result.client_company = result.client.company;
    delete result.client;
  }
  return result;
}

// List interactions for a client or opportunity
export const listInteractions: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { clientId, opportunityId } = req.query;

    if (shouldUsePrisma) {
      const rows = await prisma.interaction.findMany({
        where: {
          userId: BigInt(userId),
          ...(clientId ? { clientId: BigInt(Number(clientId)) } : {}),
          ...(opportunityId ? { opportunityId: BigInt(Number(opportunityId)) } : {}),
        },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { createdAt: "desc" }, take: 50,
      });
      res.json({ success: true, data: rows.map(serializeInteraction) });
      return;
    }

    let query = `
      SELECT i.*, c.name as client_name
      FROM interactions i
      JOIN clients c ON i.client_id = c.id
      WHERE c.user_id = ?
    `;
    const params: any[] = [userId];

    if (clientId) {
      query += " AND i.client_id = ?";
      params.push(clientId);
    }

    if (opportunityId) {
      query += " AND i.opportunity_id = ?";
      params.push(opportunityId);
    }

    query += " ORDER BY i.created_at DESC LIMIT 50";

    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

// Create a new interaction
export const createInteraction: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { clientId, opportunityId, type, subject, notes, nextFollowUp } = req.body;

    if (!clientId) {
      throw new AppError("O ID do cliente é obrigatório", 400);
    }

    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const linkedClientId = BigInt(Number(clientId));
      const client = await prisma.client.findFirst({ where: { id: linkedClientId, userId: owner }, select: { id: true } });
      if (!client) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
      const linkedOpportunityId = opportunityId ? BigInt(Number(opportunityId)) : null;
      if (linkedOpportunityId) {
        const opportunity = await prisma.opportunity.findFirst({
          where: { id: linkedOpportunityId, userId: owner, clientId: linkedClientId }, select: { id: true },
        });
        if (!opportunity) throw new AppError("Oportunidade não encontrada ou acesso não autorizado", 404);
      }
      const created = await prisma.interaction.create({
        data: {
          userId: owner, clientId: linkedClientId, opportunityId: linkedOpportunityId,
          type: type || "note", subject: subject?.trim() || null, notes: notes?.trim() || null,
          nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
        },
      });
      res.json({ success: true, data: serializeInteraction(created) });
      return;
    }

    // Verify client ownership
    const client = db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(clientId, userId);
    if (!client) {
      throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
    }

    const result = db
      .prepare(
        `INSERT INTO interactions (user_id, client_id, opportunity_id, type, subject, notes, next_follow_up)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        userId,
        clientId,
        opportunityId || null,
        type || "note",
        subject?.trim() || null,
        notes?.trim() || null,
        nextFollowUp || null,
      );

    const newInteraction = db.prepare("SELECT * FROM interactions WHERE id = ?").get(result.lastInsertRowid);

    res.json({ success: true, data: newInteraction });
  } catch (e) {
    next(e);
  }
};

// Update interaction
export const updateInteraction: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const interactionId = req.params.id;
    const { type, subject, notes, nextFollowUp } = req.body;

    if (shouldUsePrisma) {
      const id = interactionIdValue(interactionId);
      const interaction = await prisma.interaction.findFirst({ where: { id, userId: BigInt(userId) } });
      if (!interaction) throw new AppError("Interação não encontrada ou acesso não autorizado", 404);
      const updated = await prisma.interaction.update({
        where: { id },
        data: {
          type: type ?? interaction.type, subject: subject?.trim() ?? interaction.subject,
          notes: notes?.trim() ?? interaction.notes,
          nextFollowUp: nextFollowUp !== undefined
            ? nextFollowUp ? new Date(nextFollowUp) : null
            : interaction.nextFollowUp,
        },
      });
      res.json({ success: true, data: serializeInteraction(updated) });
      return;
    }

    const interaction = db
      .prepare(
        `SELECT i.id, i.type, i.subject, i.notes, i.next_follow_up FROM interactions i
         JOIN clients c ON i.client_id = c.id
         WHERE i.id = ? AND c.user_id = ?`,
      )
      .get(interactionId, userId) as DbInteraction | undefined;

    if (!interaction) {
      throw new AppError("Interação não encontrada ou acesso não autorizado", 404);
    }

    db.prepare(
      `UPDATE interactions SET
        type = ?,
        subject = ?,
        notes = ?,
        next_follow_up = ?
      WHERE id = ?`,
    ).run(
      type ?? interaction.type,
      subject?.trim() ?? interaction.subject,
      notes?.trim() ?? interaction.notes,
      nextFollowUp ?? interaction.next_follow_up,
      interactionId,
    );

    const updated = db.prepare("SELECT * FROM interactions WHERE id = ?").get(interactionId);

    res.json({ success: true, data: updated });
  } catch (e) {
    next(e);
  }
};

// Delete interaction
export const deleteInteraction: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const interactionId = req.params.id;

    if (shouldUsePrisma) {
      const result = await prisma.interaction.deleteMany({
        where: { id: interactionIdValue(interactionId), userId: BigInt(userId) },
      });
      if (result.count === 0) throw new AppError("Interação não encontrada ou acesso não autorizado", 404);
      res.json({ success: true, data: { id: Number(interactionId) } });
      return;
    }

    const result = db
      .prepare(
        `DELETE FROM interactions
         WHERE id = ? AND client_id IN (SELECT id FROM clients WHERE user_id = ?)`,
      )
      .run(interactionId, userId);

    if (result.changes === 0) {
      throw new AppError("Interação não encontrada ou acesso não autorizado", 404);
    }

    res.json({ success: true, data: { id: Number(interactionId) } });
  } catch (e) {
    next(e);
  }
};

// Get upcoming follow-ups
export const getUpcomingFollowUps: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    if (shouldUsePrisma) {
      const rows = await prisma.interaction.findMany({
        where: { userId: BigInt(userId), nextFollowUp: { gte: new Date() } },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { nextFollowUp: "asc" }, take: 20,
      });
      res.json({ success: true, data: rows.map(serializeInteraction) });
      return;
    }

    const rows = db
      .prepare(
        `SELECT i.*, c.name as client_name, c.company as client_company
         FROM interactions i
         JOIN clients c ON i.client_id = c.id
         WHERE c.user_id = ? AND i.next_follow_up IS NOT NULL
         AND date(i.next_follow_up) >= date('now')
         ORDER BY i.next_follow_up ASC
         LIMIT 20`,
      )
      .all(userId);

    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};
