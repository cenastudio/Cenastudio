import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbProjectMember, DbProject } from "../models/types.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

function serializeMember(value: any) {
  const result = withSnakeCase(value, {
    projectId: "project_id", userId: "user_id", collaboratorId: "collaborator_id",
    createdAt: "created_at", updatedAt: "updated_at",
  }) as any;
  if (result.collaborator) {
    result.name = result.collaborator.name;
    result.email = result.collaborator.email;
    result.collaborator_role = result.collaborator.role;
    delete result.collaborator;
  }
  return result;
}

// List members for a project
export const listProjectMembers: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.projectId);

    if (!projectId) {
      throw new AppError("Project ID is required", 400);
    }
    if (shouldUsePrisma) {
      const project = await prisma.project.findFirst({ where: { id: BigInt(projectId), userId: BigInt(userId) }, select: { id: true } });
      if (!project) throw new AppError("Project not found", 404);
      const members = await prisma.projectMember.findMany({
        where: { projectId: project.id }, include: { collaborator: { select: { name: true, email: true, role: true } } },
      });
      res.json({ success: true, data: members.map(serializeMember) });
      return;
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const members = db
      .prepare(
        `SELECT pm.*, c.name, c.email, c.role as collaborator_role
         FROM project_members pm
         LEFT JOIN collaborators c ON pm.collaborator_id = c.id
         WHERE pm.project_id = ?`,
      )
      .all(projectId);

    res.json({ success: true, data: members });
  } catch (e) {
    next(e);
  }
};

// Add a member to a project
export const addProjectMember: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.projectId);
    const { collaboratorId, role } = req.body;

    if (!projectId || !collaboratorId) {
      throw new AppError("Project ID and Collaborator ID are required", 400);
    }
    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      const [project, collaborator] = await Promise.all([
        prisma.project.findFirst({ where: { id: BigInt(projectId), userId: owner }, select: { id: true } }),
        prisma.collaborator.findFirst({ where: { id: BigInt(collaboratorId), userId: owner }, select: { id: true } }),
      ]);
      if (!project) throw new AppError("Project not found", 404);
      if (!collaborator) throw new AppError("Collaborator not found", 404);
      const existing = await prisma.projectMember.findFirst({ where: { projectId: project.id, collaboratorId: collaborator.id } });
      if (existing) throw new AppError("Collaborator is already a member of this project", 400);
      const created = await prisma.projectMember.create({
        data: { projectId: project.id, collaboratorId: collaborator.id, role: role || "member" },
        include: { collaborator: { select: { name: true, email: true, role: true } } },
      });
      res.json({ success: true, data: serializeMember(created) });
      return;
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    // Verify collaborator exists and belongs to user
    const collaborator = db
      .prepare("SELECT * FROM collaborators WHERE id = ? AND user_id = ?")
      .get(collaboratorId, userId);

    if (!collaborator) {
      throw new AppError("Collaborator not found", 404);
    }

    // Check if already a member
    const existing = db
      .prepare("SELECT * FROM project_members WHERE project_id = ? AND collaborator_id = ?")
      .get(projectId, collaboratorId);

    if (existing) {
      throw new AppError("Collaborator is already a member of this project", 400);
    }

    const result = db
      .prepare(
        `INSERT INTO project_members (project_id, collaborator_id, role, created_at)
         VALUES (?, ?, ?, datetime('now'))`,
      )
      .run(projectId, collaboratorId, role || "member");

    const newMember = db
      .prepare(
        `SELECT pm.*, c.name, c.email, c.role as collaborator_role
         FROM project_members pm
         LEFT JOIN collaborators c ON pm.collaborator_id = c.id
         WHERE pm.id = ?`,
      )
      .get(result.lastInsertRowid);

    res.json({ success: true, data: newMember });
  } catch (e) {
    next(e);
  }
};

// Update member role
export const updateProjectMember: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const memberId = parseInt(req.params.id);
    const { role } = req.body;

    if (!memberId) {
      throw new AppError("Member ID is required", 400);
    }
    if (shouldUsePrisma) {
      const member = await prisma.projectMember.findUnique({
        where: { id: BigInt(memberId) }, include: { project: { select: { userId: true } } },
      });
      if (!member) throw new AppError("Member not found", 404);
      if (Number(member.project.userId) !== userId) throw new AppError("You don't have permission to update this member", 403);
      const updated = await prisma.projectMember.update({
        where: { id: member.id }, data: { role: role || "member", updatedAt: new Date() },
        include: { collaborator: { select: { name: true, email: true, role: true } } },
      });
      res.json({ success: true, data: serializeMember(updated) });
      return;
    }

    const member = db
      .prepare(
        `SELECT pm.*, p.user_id as project_owner_id
         FROM project_members pm
         JOIN projects p ON pm.project_id = p.id
         WHERE pm.id = ?`,
      )
      .get(memberId) as any;

    if (!member) {
      throw new AppError("Member not found", 404);
    }

    if (member.project_owner_id !== userId) {
      throw new AppError("You don't have permission to update this member", 403);
    }

    db
      .prepare("UPDATE project_members SET role = ?, updated_at = datetime('now') WHERE id = ?")
      .run(role || "member", memberId);

    const updatedMember = db
      .prepare(
        `SELECT pm.*, c.name, c.email, c.role as collaborator_role
         FROM project_members pm
         LEFT JOIN collaborators c ON pm.collaborator_id = c.id
         WHERE pm.id = ?`,
      )
      .get(memberId);

    res.json({ success: true, data: updatedMember });
  } catch (e) {
    next(e);
  }
};

// Remove a member from a project
export const removeProjectMember: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const memberId = parseInt(req.params.id);

    if (!memberId) {
      throw new AppError("Member ID is required", 400);
    }
    if (shouldUsePrisma) {
      const member = await prisma.projectMember.findUnique({
        where: { id: BigInt(memberId) }, include: { project: { select: { userId: true } } },
      });
      if (!member) throw new AppError("Member not found", 404);
      if (Number(member.project.userId) !== userId) throw new AppError("You don't have permission to remove this member", 403);
      await prisma.projectMember.delete({ where: { id: member.id } });
      res.json({ success: true, message: "Member removed successfully" });
      return;
    }

    const member = db
      .prepare(
        `SELECT pm.*, p.user_id as project_owner_id
         FROM project_members pm
         JOIN projects p ON pm.project_id = p.id
         WHERE pm.id = ?`,
      )
      .get(memberId) as any;

    if (!member) {
      throw new AppError("Member not found", 404);
    }

    if (member.project_owner_id !== userId) {
      throw new AppError("You don't have permission to remove this member", 403);
    }

    db.prepare("DELETE FROM project_members WHERE id = ?").run(memberId);

    res.json({ success: true, message: "Member removed successfully" });
  } catch (e) {
    next(e);
  }
};

// Get projects for a collaborator
export const getCollaboratorProjects: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const collaboratorId = parseInt(req.params.collaboratorId);

    if (!collaboratorId) {
      throw new AppError("Collaborator ID is required", 400);
    }
    if (shouldUsePrisma) {
      const collaborator = await prisma.collaborator.findFirst({
        where: { id: BigInt(collaboratorId), userId: BigInt(userId) }, select: { id: true },
      });
      if (!collaborator) throw new AppError("Collaborator not found", 404);
      const memberships = await prisma.projectMember.findMany({
        where: { collaboratorId: collaborator.id }, include: { project: true }, orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: memberships.map((item) => ({
        ...withSnakeCase(item.project as any, {
          userId: "user_id", clientId: "client_id", metadataJson: "metadata_json",
          createdAt: "created_at", updatedAt: "updated_at",
        }), member_role: item.role, joined_at: item.createdAt.toISOString(),
      })) });
      return;
    }

    // Verify collaborator belongs to user
    const collaborator = db
      .prepare("SELECT * FROM collaborators WHERE id = ? AND user_id = ?")
      .get(collaboratorId, userId);

    if (!collaborator) {
      throw new AppError("Collaborator not found", 404);
    }

    const projects = db
      .prepare(
        `SELECT p.*, pm.role as member_role, pm.created_at as joined_at
         FROM project_members pm
         JOIN projects p ON pm.project_id = p.id
         WHERE pm.collaborator_id = ?
         ORDER BY pm.created_at DESC`,
      )
      .all(collaboratorId);

    res.json({ success: true, data: projects });
  } catch (e) {
    next(e);
  }
};
