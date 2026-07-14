/**
 * Team Service
 * Handles creating team member accounts linked to the studio owner's workspace.
 * Only available for Studio plan users.
 *
 * Flow:
 * 1. Admin creates a team member (name, email, password, role)
 * 2. A real User is created in the DB with a special flag (is_team_member)
 * 3. The user is added as a WorkspaceMember to the admin's workspace
 * 4. The team member logs in normally but sees a filtered interface
 */

import bcrypt from "bcryptjs";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { AppError } from "../middleware/errorHandler.js";
import { getUserEntitlements } from "./entitlementService.js";
import { logger } from "../utils/logger.js";

export type TeamRole = "producer" | "editor" | "viewer";

export interface TeamMember {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: TeamRole;
  status: "active" | "inactive";
  createdAt: string;
}

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

/**
 * Get the admin's workspace ID
 */
async function getOwnerWorkspaceId(ownerId: number): Promise<number> {
  if (shouldUsePrisma) {
    const workspace = await prisma.workspace.findFirst({
      where: { ownerUserId: BigInt(ownerId) },
      select: { id: true },
    });
    if (!workspace) throw new AppError("Workspace não encontrado.", 404);
    return Number(workspace.id);
  }

  const row = db
    .prepare("SELECT id FROM workspaces WHERE owner_user_id = ? LIMIT 1")
    .get(ownerId) as { id: number } | undefined;
  if (!row) throw new AppError("Workspace não encontrado.", 404);
  return row.id;
}

/**
 * Count existing team members for a workspace owner
 */
async function countTeamMembers(ownerId: number): Promise<number> {
  const workspaceId = await getOwnerWorkspaceId(ownerId);

  if (shouldUsePrisma) {
    return await (prisma as any).workspaceMember.count({
      where: {
        workspaceId: BigInt(workspaceId),
        role: { not: "owner" },
        status: "active",
      },
    });
  }

  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM workspace_members WHERE workspace_id = ? AND role != 'owner' AND status = 'active'",
    )
    .get(workspaceId) as { count: number };
  return row.count;
}

/**
 * Assert the owner's plan includes team members and still has capacity.
 * The allowance is driven entirely by the plan entitlements
 * (`teamMemberLimit`): 0 means the feature is not part of the plan, -1 means
 * unlimited. This keeps enforcement consistent with what each plan advertises.
 */
async function assertTeamCapacity(ownerId: number): Promise<void> {
  const entitlement = await getUserEntitlements(ownerId);
  const limit = entitlement.teamMemberLimit;

  if (limit === 0) {
    throw new AppError(
      "O recurso Equipe não está incluído no seu plano. Faça upgrade para adicionar membros.",
      402,
    );
  }
  if (!entitlement.operational) {
    throw new AppError("Ative seu plano para gerenciar a equipe.", 402);
  }

  if (limit !== -1) {
    const currentCount = await countTeamMembers(ownerId);
    if (currentCount >= limit) {
      throw new AppError(
        `Seu plano permite até ${limit} ${limit === 1 ? "membro" : "membros"}. Remova um membro ou faça upgrade para expandir.`,
        402,
      );
    }
  }
}

/**
 * Create a team member account
 * Creates a User record + links it to the admin's workspace
 */
export async function createTeamMember(
  ownerId: number,
  data: { name: string; email: string; password: string; role: TeamRole },
): Promise<TeamMember> {
  await assertTeamCapacity(ownerId);

  const { name, email, password, role } = data;
  const normalizedEmail = email.toLowerCase().trim();

  if (!name?.trim()) throw new AppError("Nome é obrigatório.", 400);
  if (!normalizedEmail) throw new AppError("Email é obrigatório.", 400);
  if (!password || password.length < 6) {
    throw new AppError("Senha precisa ter pelo menos 6 caracteres.", 400);
  }

  const workspaceId = await getOwnerWorkspaceId(ownerId);
  const passwordHash = hashPassword(password);

  if (shouldUsePrisma) {
    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new AppError("Este email já está em uso.", 409);

    // Create user with must_reset_password = true
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: "user",
        emailVerified: true,
        mustResetPassword: true,
      },
    });

    // Add to workspace
    await (prisma as any).workspaceMember.create({
      data: {
        workspaceId: BigInt(workspaceId),
        userId: user.id,
        role,
        status: "active",
        acceptedAt: new Date(),
      },
    });

    // No subscription for team members — they use the owner's plan
    logger.info({ ownerId, memberId: Number(user.id), role }, "Team member created");

    return {
      id: Number(user.id),
      userId: Number(user.id),
      name: user.name || name.trim(),
      email: user.email,
      role,
      status: "active",
      createdAt: new Date().toISOString(),
    };
  }

  // SQLite path
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existingUser) throw new AppError("Este email já está em uso.", 409);

  const result = db
    .prepare(
      "INSERT INTO users (name, email, password_hash, role, email_verified, must_reset_password) VALUES (?, ?, ?, 'user', 1, 1)",
    )
    .run(name.trim(), normalizedEmail, passwordHash);

  const userId = Number(result.lastInsertRowid);

  db.prepare(
    `INSERT INTO workspace_members (workspace_id, user_id, role, status, accepted_at)
     VALUES (?, ?, ?, 'active', datetime('now'))`,
  ).run(workspaceId, userId, role);

  logger.info({ ownerId, memberId: userId, role }, "Team member created");

  return {
    id: userId,
    userId,
    name: name.trim(),
    email: normalizedEmail,
    role,
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

/**
 * List team members for a workspace owner
 */
export async function listTeamMembers(ownerId: number): Promise<TeamMember[]> {
  const workspaceId = await getOwnerWorkspaceId(ownerId);

  if (shouldUsePrisma) {
    const members = await (prisma as any).workspaceMember.findMany({
      where: {
        workspaceId: BigInt(workspaceId),
        role: { not: "owner" },
      },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return members.map((m: any) => ({
      id: Number(m.id),
      userId: Number(m.user?.id || m.userId),
      name: m.user?.name || "Sem nome",
      email: m.user?.email || "",
      role: m.role as TeamRole,
      status: m.status as "active" | "inactive",
      createdAt: m.createdAt?.toISOString() || "",
    }));
  }

  const rows = db
    .prepare(
      `SELECT wm.id, wm.user_id, wm.role, wm.status, wm.created_at,
              u.name, u.email
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = ? AND wm.role != 'owner'
       ORDER BY wm.created_at DESC`,
    )
    .all(workspaceId) as any[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name || "Sem nome",
    email: r.email || "",
    role: r.role as TeamRole,
    status: r.status as "active" | "inactive",
    createdAt: r.created_at || "",
  }));
}

/**
 * Update a team member's role or status
 */
export async function updateTeamMember(
  ownerId: number,
  memberId: number,
  updates: { role?: TeamRole; status?: "active" | "inactive" },
): Promise<TeamMember> {
  const workspaceId = await getOwnerWorkspaceId(ownerId);

  if (shouldUsePrisma) {
    const member = await (prisma as any).workspaceMember.findFirst({
      where: { id: BigInt(memberId), workspaceId: BigInt(workspaceId), role: { not: "owner" } },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
    if (!member) throw new AppError("Membro não encontrado.", 404);

    const updated = await (prisma as any).workspaceMember.update({
      where: { id: member.id },
      data: {
        ...(updates.role && { role: updates.role }),
        ...(updates.status && { status: updates.status }),
        updatedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return {
      id: Number(updated.id),
      userId: Number(updated.user?.id || updated.userId),
      name: updated.user?.name || "Sem nome",
      email: updated.user?.email || "",
      role: updated.role as TeamRole,
      status: updated.status as "active" | "inactive",
      createdAt: updated.createdAt?.toISOString() || "",
    };
  }

  const member = db
    .prepare(
      "SELECT wm.*, u.name, u.email FROM workspace_members wm JOIN users u ON u.id = wm.user_id WHERE wm.id = ? AND wm.workspace_id = ? AND wm.role != 'owner'",
    )
    .get(memberId, workspaceId) as any;
  if (!member) throw new AppError("Membro não encontrado.", 404);

  const setFields: string[] = [];
  const values: any[] = [];

  if (updates.role) { setFields.push("role = ?"); values.push(updates.role); }
  if (updates.status) { setFields.push("status = ?"); values.push(updates.status); }
  setFields.push("updated_at = datetime('now')");
  values.push(memberId);

  db.prepare(`UPDATE workspace_members SET ${setFields.join(", ")} WHERE id = ?`).run(...values);

  return {
    id: member.id,
    userId: member.user_id,
    name: member.name,
    email: member.email,
    role: updates.role || member.role,
    status: updates.status || member.status,
    createdAt: member.created_at,
  };
}

/**
 * Remove a team member (deactivate their account)
 */
export async function removeTeamMember(ownerId: number, memberId: number): Promise<void> {
  const workspaceId = await getOwnerWorkspaceId(ownerId);

  if (shouldUsePrisma) {
    const member = await (prisma as any).workspaceMember.findFirst({
      where: { id: BigInt(memberId), workspaceId: BigInt(workspaceId), role: { not: "owner" } },
    });
    if (!member) throw new AppError("Membro não encontrado.", 404);

    await (prisma as any).workspaceMember.update({
      where: { id: member.id },
      data: { status: "inactive", updatedAt: new Date() },
    });

    logger.info({ ownerId, memberId }, "Team member removed");
    return;
  }

  const member = db
    .prepare(
      "SELECT id FROM workspace_members WHERE id = ? AND workspace_id = ? AND role != 'owner'",
    )
    .get(memberId, workspaceId) as { id: number } | undefined;
  if (!member) throw new AppError("Membro não encontrado.", 404);

  db.prepare("UPDATE workspace_members SET status = 'inactive', updated_at = datetime('now') WHERE id = ?").run(memberId);
  logger.info({ ownerId, memberId }, "Team member removed");
}

/**
 * Check if a user is a team member (not an owner)
 * Returns the workspace owner's ID if yes, null if user is an independent account
 */
export async function getTeamMemberContext(userId: number): Promise<{
  isTeamMember: boolean;
  ownerUserId: number | null;
  workspaceId: number | null;
  role: TeamRole | null;
} | null> {
  if (shouldUsePrisma) {
    const memberships = await (prisma as any).workspaceMember.findMany({
      where: { userId: BigInt(userId), status: "active" },
      include: { workspace: { select: { ownerUserId: true, id: true } } },
      orderBy: { id: "asc" },
      take: 2,
    });

    if (memberships.length === 0) {
      return { isTeamMember: false, ownerUserId: null, workspaceId: null, role: null };
    }
    if (memberships.length > 1) {
      throw new AppError("Usuário vinculado a múltiplos espaços de trabalho. Selecione um workspace explicitamente.", 409);
    }

    const membership = memberships[0];
    const isOwner = membership.role === "owner";
    return {
      isTeamMember: !isOwner,
      ownerUserId: isOwner ? null : Number(membership.workspace.ownerUserId),
      workspaceId: Number(membership.workspace.id),
      role: isOwner ? null : (membership.role as TeamRole),
    };
  }

  const rows = db
    .prepare(
      `SELECT wm.role, w.owner_user_id, w.id as workspace_id
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       WHERE wm.user_id = ? AND wm.status = 'active'
       ORDER BY wm.id ASC LIMIT 2`,
    )
    .all(userId) as Array<{ role: string; owner_user_id: number; workspace_id: number }>;

  if (rows.length === 0) return { isTeamMember: false, ownerUserId: null, workspaceId: null, role: null };
  if (rows.length > 1) {
    throw new AppError("Usuário vinculado a múltiplos espaços de trabalho. Selecione um workspace explicitamente.", 409);
  }

  const row = rows[0];
  const isOwner = row.role === "owner";
  return {
    isTeamMember: !isOwner,
    ownerUserId: isOwner ? null : row.owner_user_id,
    workspaceId: row.workspace_id,
    role: isOwner ? null : (row.role as TeamRole),
  };
}

/**
 * Get projects visible to a team member
 * Only projects where they're assigned via project_members
 */
export async function getTeamMemberProjects(userId: number, ownerUserId: number): Promise<number[]> {
  if (shouldUsePrisma) {
    const members = await prisma.projectMember.findMany({
      where: {
        userId: BigInt(userId),
        project: { userId: BigInt(ownerUserId) },
      },
      select: { projectId: true },
    });
    return members.map((member) => Number(member.projectId));
  }

  const rows = db
    .prepare(
      `SELECT DISTINCT pm.project_id
       FROM project_members pm
       JOIN projects p ON p.id = pm.project_id
       WHERE pm.user_id = ? AND p.user_id = ?`,
    )
    .all(userId, ownerUserId) as { project_id: number }[];

  return rows.map((r) => r.project_id);
}
