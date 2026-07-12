import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import { listAssignableMembers } from "../services/taskService.js";

// Spec: team-task-delegation, Fase 6-C. Project members are always a team
// member (User via userId) — the legacy freelancer-without-login path
// (Collaborator/collaboratorId) has been fully removed. See git history
// (commits from the "6-B"/"6-C" checkpoints) if that model is ever needed
// again; production held 0 rows for it at removal time.

function serializeMember(value: any) {
  const result = withSnakeCase(value, {
    projectId: "project_id", userId: "user_id",
    createdAt: "created_at", updatedAt: "updated_at",
  }) as any;
  if (result.user) {
    result.name = result.user.name || result.user.email;
    result.email = result.user.email;
    delete result.user;
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
        where: { projectId: project.id },
        include: { user: { select: { name: true, email: true } } },
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
        `SELECT pm.*, u.name, u.email
         FROM project_members pm
         LEFT JOIN users u ON pm.user_id = u.id
         WHERE pm.project_id = ?`,
      )
      .all(projectId);

    res.json({ success: true, data: members });
  } catch (e) {
    next(e);
  }
};

// Add a team member (by userId) to a project.
export const addProjectMember: RequestHandler = async (req, res, next) => {
  try {
    const actingUserId = req.user!.id;
    const projectId = parseInt(req.params.projectId);
    const { userId: memberUserIdRaw, role } = req.body;
    const memberUserId = memberUserIdRaw !== undefined ? Number(memberUserIdRaw) : null;

    if (!projectId || !memberUserId) {
      throw new AppError("Project ID and userId are required", 400);
    }

    // Validate the target user is the owner or an active team member of the
    // project's workspace (reuses the same roster used by task assignment).
    const roster = await listAssignableMembers(actingUserId, projectId);
    if (!roster.some((m) => m.id === memberUserId)) {
      throw new AppError("Usuário não é um membro válido deste workspace.", 400);
    }

    if (shouldUsePrisma) {
      const project = await prisma.project.findFirst({ where: { id: BigInt(projectId), userId: BigInt(actingUserId) }, select: { id: true } });
      if (!project) throw new AppError("Project not found", 404);
      const existing = await prisma.projectMember.findFirst({ where: { projectId: project.id, userId: BigInt(memberUserId) } });
      if (existing) throw new AppError("Este membro já está no projeto", 400);
      const created = await prisma.projectMember.create({
        data: { projectId: project.id, userId: BigInt(memberUserId), role: role || "member" },
        include: { user: { select: { name: true, email: true } } },
      });
      res.json({ success: true, data: serializeMember(created) });
      return;
    }

    const project = db.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?").get(projectId, actingUserId);
    if (!project) throw new AppError("Project not found", 404);
    const existing = db.prepare("SELECT id FROM project_members WHERE project_id = ? AND user_id = ?").get(projectId, memberUserId);
    if (existing) throw new AppError("Este membro já está no projeto", 400);
    const result = db
      .prepare("INSERT INTO project_members (project_id, user_id, role, created_at) VALUES (?, ?, ?, datetime('now'))")
      .run(projectId, memberUserId, role || "member");
    const newMember = db
      .prepare(
        `SELECT pm.*, u.name, u.email
         FROM project_members pm LEFT JOIN users u ON pm.user_id = u.id
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
        include: { user: { select: { name: true, email: true } } },
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
        `SELECT pm.*, u.name, u.email
         FROM project_members pm
         LEFT JOIN users u ON pm.user_id = u.id
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
