import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbCollaborator, DbCountByCount } from "../models/types.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

function serializeCollaborator(value: any) {
  return withSnakeCase(value, {
    userId: "user_id", dailyRate: "daily_rate", createdAt: "created_at", updatedAt: "updated_at",
  });
}

// List all collaborators for the current user
export const listCollaborators: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const collaborators = await prisma.collaborator.findMany({
        where: { userId: BigInt(userId) }, orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: collaborators.map(serializeCollaborator) });
      return;
    }

    const collaborators = db
      .prepare("SELECT * FROM collaborators WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId);

    res.json({ success: true, data: collaborators });
  } catch (e) {
    next(e);
  }
};

// Get a specific collaborator
export const getCollaborator: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const collaboratorId = parseInt(req.params.id);

    if (!collaboratorId) {
      throw new AppError("Collaborator ID is required", 400);
    }
    if (shouldUsePrisma) {
      const collaborator = await prisma.collaborator.findFirst({
        where: { id: BigInt(collaboratorId), userId: BigInt(userId) },
      });
      if (!collaborator) throw new AppError("Collaborator not found", 404);
      res.json({ success: true, data: serializeCollaborator(collaborator) });
      return;
    }

    const collaborator = db
      .prepare("SELECT * FROM collaborators WHERE id = ? AND user_id = ?")
      .get(collaboratorId, userId);

    if (!collaborator) {
      throw new AppError("Collaborator not found", 404);
    }

    res.json({ success: true, data: collaborator });
  } catch (e) {
    next(e);
  }
};

// Create a new collaborator
export const createCollaborator: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, email, role, phone, skills, daily_rate } = req.body;

    if (!name || !email) {
      throw new AppError("Name and email are required", 400);
    }
    if (shouldUsePrisma) {
      const created = await prisma.collaborator.create({ data: {
        userId: BigInt(userId), name: name.trim(), email: email.trim(), role: role || "member",
        phone: phone || "", skills: skills || "", dailyRate: Number(daily_rate) || 0,
      } });
      res.json({ success: true, data: serializeCollaborator(created) });
      return;
    }

    const result = db
      .prepare(
        `INSERT INTO collaborators (user_id, name, email, role, phone, skills, daily_rate, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .run(userId, name.trim(), email.trim(), role || "member", phone || "", skills || "", daily_rate || 0);

    const newCollaborator = db
      .prepare("SELECT * FROM collaborators WHERE id = ?")
      .get(result.lastInsertRowid);

    res.json({ success: true, data: newCollaborator });
  } catch (e) {
    next(e);
  }
};

// Update a collaborator
export const updateCollaborator: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const collaboratorId = parseInt(req.params.id);
    const { name, email, role, phone, skills, daily_rate, status } = req.body;

    if (!collaboratorId) {
      throw new AppError("Collaborator ID is required", 400);
    }
    if (shouldUsePrisma) {
      const collaborator = await prisma.collaborator.findFirst({
        where: { id: BigInt(collaboratorId), userId: BigInt(userId) },
      });
      if (!collaborator) throw new AppError("Collaborator not found", 404);
      const updated = await prisma.collaborator.update({
        where: { id: collaborator.id }, data: {
          name: name?.trim() || collaborator.name, email: email?.trim() || collaborator.email,
          role: role || collaborator.role, phone: phone !== undefined ? phone : collaborator.phone,
          skills: skills !== undefined ? skills : collaborator.skills,
          dailyRate: daily_rate !== undefined ? Number(daily_rate) : collaborator.dailyRate,
          status: status || collaborator.status, updatedAt: new Date(),
        },
      });
      res.json({ success: true, data: serializeCollaborator(updated) });
      return;
    }

    const collaborator = db
      .prepare("SELECT * FROM collaborators WHERE id = ? AND user_id = ?")
      .get(collaboratorId, userId) as DbCollaborator | undefined;

    if (!collaborator) {
      throw new AppError("Collaborator not found", 404);
    }

    db
      .prepare(
        `UPDATE collaborators
         SET name = ?, email = ?, role = ?, phone = ?, skills = ?, daily_rate = ?, status = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        name?.trim() || collaborator.name,
        email?.trim() || collaborator.email,
        role || collaborator.role,
        phone !== undefined ? phone : collaborator.phone,
        skills !== undefined ? skills : collaborator.skills,
        daily_rate !== undefined ? daily_rate : collaborator.daily_rate,
        status || collaborator.status,
        collaboratorId,
      );

    const updatedCollaborator = db
      .prepare("SELECT * FROM collaborators WHERE id = ?")
      .get(collaboratorId);

    res.json({ success: true, data: updatedCollaborator });
  } catch (e) {
    next(e);
  }
};

// Delete a collaborator
export const deleteCollaborator: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const collaboratorId = parseInt(req.params.id);

    if (!collaboratorId) {
      throw new AppError("Collaborator ID is required", 400);
    }
    if (shouldUsePrisma) {
      const result = await prisma.collaborator.deleteMany({
        where: { id: BigInt(collaboratorId), userId: BigInt(userId) },
      });
      if (result.count === 0) throw new AppError("Collaborator not found", 404);
      res.json({ success: true, message: "Collaborator deleted successfully" });
      return;
    }

    const collaborator = db
      .prepare("SELECT * FROM collaborators WHERE id = ? AND user_id = ?")
      .get(collaboratorId, userId);

    if (!collaborator) {
      throw new AppError("Collaborator not found", 404);
    }

    // Remove from all projects first
    db.prepare("DELETE FROM project_members WHERE collaborator_id = ?").run(collaboratorId);

    // Delete collaborator
    db.prepare("DELETE FROM collaborators WHERE id = ?").run(collaboratorId);

    res.json({ success: true, message: "Collaborator deleted successfully" });
  } catch (e) {
    next(e);
  }
};

// Get collaborator statistics
export const getCollaboratorStats: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const [totalCollaborators, activeCollaborators, grouped, totalProjects] = await Promise.all([
        prisma.collaborator.count({ where: { userId: owner } }),
        prisma.collaborator.count({ where: { userId: owner, status: "active" } }),
        prisma.collaborator.groupBy({ by: ["role"], where: { userId: owner }, _count: { _all: true } }),
        prisma.projectMember.count({ where: { collaborator: { userId: owner } } }),
      ]);
      res.json({ success: true, data: {
        totalCollaborators, activeCollaborators,
        byRole: grouped.map((item) => ({ role: item.role, count: item._count._all })), totalProjects,
      } });
      return;
    }

    const totalCollaborators = db.prepare("SELECT COUNT(*) as count FROM collaborators WHERE user_id = ?").get(userId) as DbCountByCount;
    const activeCollaborators = db.prepare("SELECT COUNT(*) as count FROM collaborators WHERE user_id = ? AND status = 'active'").get(userId) as DbCountByCount;
    const byRole = db.prepare("SELECT role, COUNT(*) as count FROM collaborators WHERE user_id = ? GROUP BY role").all(userId);
    const totalProjects = db.prepare("SELECT COUNT(*) as count FROM project_members pm JOIN collaborators c ON pm.collaborator_id = c.id WHERE c.user_id = ?").get(userId) as DbCountByCount;

    res.json({
      success: true,
      data: {
        totalCollaborators: totalCollaborators.count,
        activeCollaborators: activeCollaborators.count,
        byRole,
        totalProjects: totalProjects.count,
      },
    });
  } catch (e) {
    next(e);
  }
};
