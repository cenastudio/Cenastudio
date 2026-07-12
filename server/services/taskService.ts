/**
 * Task Service (spec: team-task-delegation, Fase 2)
 *
 * Delegação de demandas dentro de um projeto para um team member (sempre
 * um usuário com conta de login — não existe mais o conceito de
 * "colaborador sem login" neste fluxo). Uma Tarefa pode opcionalmente
 * referenciar uma etapa (`stageId`) e/ou ferramenta (`toolSlug`) do
 * workflow do projeto — ambos validados contra server/lib/workflowStages.ts.
 */

import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import { notifyUser } from "./notificationService.js";
import { getTeamMemberContext, listTeamMembers } from "./teamService.js";
import { isValidStageId, isValidToolSlug } from "../lib/workflowStages.js";

export type TaskStatus = "pending" | "in_progress" | "done";

export interface TaskRecord {
  id: number;
  project_id: number;
  assignee_user_id: number;
  created_by_user_id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  stage_id: string | null;
  tool_slug: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Denormalized display fields (joined), present on list/get responses.
  assignee_name?: string;
  assignee_email?: string;
  project_name?: string;
}

export interface TaskInput {
  title: string;
  description?: string | null;
  assigneeUserId: number;
  dueDate?: string | null;
  stageId?: string | null;
  toolSlug?: string | null;
}

function serializeTask(value: any): TaskRecord {
  return withSnakeCase(value, {
    projectId: "project_id",
    assigneeUserId: "assignee_user_id",
    createdByUserId: "created_by_user_id",
    dueDate: "due_date",
    stageId: "stage_id",
    toolSlug: "tool_slug",
    completedAt: "completed_at",
    createdAt: "created_at",
    updatedAt: "updated_at",
  }) as unknown as TaskRecord;
}

/**
 * Resolves the workspace owner id for a given project, and confirms the
 * acting user (owner or team member) is allowed to see/act on that project.
 * Returns the project's owner id and basic project info.
 */
async function assertProjectAccess(
  actingUserId: number,
  projectId: number,
): Promise<{ ownerId: number; projectName: string }> {
  let project: { userId: number; name: string } | null = null;

  if (shouldUsePrisma) {
    const row = await prisma.project.findUnique({
      where: { id: BigInt(projectId) },
      select: { userId: true, name: true },
    });
    if (row) project = { userId: Number(row.userId), name: row.name };
  } else {
    const row = db.prepare("SELECT user_id, name FROM projects WHERE id = ?").get(projectId) as
      | { user_id: number; name: string }
      | undefined;
    if (row) project = { userId: row.user_id, name: row.name };
  }

  if (!project) throw new AppError("Projeto não encontrado", 404);

  if (project.userId === actingUserId) {
    return { ownerId: project.userId, projectName: project.name };
  }

  // Not the owner — must be an active team member of the owner's workspace.
  const context = await getTeamMemberContext(actingUserId);
  if (context?.isTeamMember && context.ownerUserId === project.userId) {
    return { ownerId: project.userId, projectName: project.name };
  }

  throw new AppError("Projeto não encontrado ou acesso não autorizado", 404);
}

/** Confirms `assigneeUserId` is the workspace owner or an active team member of it. */
async function assertAssigneeInWorkspace(ownerId: number, assigneeUserId: number): Promise<void> {
  if (assigneeUserId === ownerId) return;
  const members = await listTeamMembers(ownerId);
  const isMember = members.some((m) => m.userId === assigneeUserId && m.status === "active");
  if (!isMember) {
    throw new AppError("Responsável inválido — precisa ser um membro da equipe deste workspace.", 400);
  }
}

/** Owner and members with role "producer" may create/assign tasks (Requisito 2.1). */
async function assertCanManageTasks(actingUserId: number, ownerId: number): Promise<void> {
  if (actingUserId === ownerId) return;
  const context = await getTeamMemberContext(actingUserId);
  if (context?.isTeamMember && context.role === "producer") return;
  throw new AppError("Você não tem permissão para criar ou atribuir tarefas.", 403);
}

export async function createTask(
  actingUserId: number,
  projectId: number,
  input: TaskInput,
): Promise<TaskRecord> {
  const { ownerId, projectName } = await assertProjectAccess(actingUserId, projectId);
  await assertCanManageTasks(actingUserId, ownerId);

  if (!input.title?.trim()) throw new AppError("Título é obrigatório.", 400);
  if (!input.assigneeUserId) throw new AppError("Responsável é obrigatório.", 400);
  await assertAssigneeInWorkspace(ownerId, input.assigneeUserId);

  if (!isValidStageId(input.stageId)) throw new AppError("Etapa do workflow inválida.", 400);
  if (!isValidToolSlug(input.toolSlug)) throw new AppError("Ferramenta do workflow inválida.", 400);

  let created: TaskRecord;

  if (shouldUsePrisma) {
    const row = await prisma.task.create({
      data: {
        projectId: BigInt(projectId),
        assigneeUserId: BigInt(input.assigneeUserId),
        createdByUserId: BigInt(actingUserId),
        title: input.title.trim(),
        description: input.description?.trim() || null,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        stageId: input.stageId || null,
        toolSlug: input.toolSlug || null,
      },
    });
    created = serializeTask(row);
  } else {
    const result = db
      .prepare(
        `INSERT INTO tasks (project_id, assignee_user_id, created_by_user_id, title, description, due_date, stage_id, tool_slug, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`,
      )
      .run(
        projectId,
        input.assigneeUserId,
        actingUserId,
        input.title.trim(),
        input.description?.trim() || null,
        input.dueDate || null,
        input.stageId || null,
        input.toolSlug || null,
      );
    created = serializeTask(
      db.prepare("SELECT * FROM tasks WHERE id = ?").get((result as any).lastInsertRowid),
    );
  }

  notifyUser(
    input.assigneeUserId,
    "Nova tarefa atribuída",
    `Você recebeu uma nova tarefa em "${projectName}": ${created.title}`,
    "task_assigned",
    `/project/${projectId}`,
  );

  return created;
}

export async function listTasksByProject(actingUserId: number, projectId: number): Promise<TaskRecord[]> {
  await assertProjectAccess(actingUserId, projectId);

  if (shouldUsePrisma) {
    const rows = await prisma.task.findMany({
      where: { projectId: BigInt(projectId) },
      include: { assignee: { select: { name: true, email: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((row: any) => ({
      ...serializeTask(row),
      assignee_name: row.assignee?.name || row.assignee?.email || "—",
      assignee_email: row.assignee?.email || "",
    }));
  }

  const rows = db
    .prepare(
      `SELECT t.*, u.name AS assignee_name, u.email AS assignee_email
       FROM tasks t
       JOIN users u ON u.id = t.assignee_user_id
       WHERE t.project_id = ?
       ORDER BY (t.due_date IS NULL), t.due_date ASC, t.created_at DESC`,
    )
    .all(projectId) as any[];
  return rows.map((row) => ({ ...serializeTask(row), assignee_name: row.assignee_name || row.assignee_email || "—" }));
}

/** Tasks assigned to the acting user, across every project they can see (Requisito 2.5). */
export async function listMyTasks(actingUserId: number): Promise<TaskRecord[]> {
  if (shouldUsePrisma) {
    const rows = await prisma.task.findMany({
      where: { assigneeUserId: BigInt(actingUserId) },
      include: { project: { select: { name: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });
    return rows.map((row: any) => ({
      ...serializeTask(row),
      project_name: row.project?.name || "",
    }));
  }

  const rows = db
    .prepare(
      `SELECT t.*, p.name AS project_name
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.assignee_user_id = ?
       ORDER BY (t.due_date IS NULL), t.due_date ASC, t.created_at DESC`,
    )
    .all(actingUserId) as any[];
  return rows.map((row) => serializeTask(row));
}

async function getTaskOrThrow(taskId: number): Promise<TaskRecord & { project_owner_id: number }> {
  if (shouldUsePrisma) {
    const row = await prisma.task.findUnique({
      where: { id: BigInt(taskId) },
      include: { project: { select: { userId: true } } },
    });
    if (!row) throw new AppError("Tarefa não encontrada", 404);
    return { ...serializeTask(row), project_owner_id: Number((row as any).project.userId) };
  }

  const row = db
    .prepare(
      `SELECT t.*, p.user_id AS project_owner_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = ?`,
    )
    .get(taskId) as any;
  if (!row) throw new AppError("Tarefa não encontrada", 404);
  return { ...serializeTask(row), project_owner_id: row.project_owner_id };
}

/** Requisito 2.7: só responsável, criador ou owner do projeto podem alterar/excluir. */
function assertCanMutateTask(actingUserId: number, task: TaskRecord & { project_owner_id: number }): void {
  const allowed =
    actingUserId === task.assignee_user_id ||
    actingUserId === task.created_by_user_id ||
    actingUserId === task.project_owner_id;
  if (!allowed) throw new AppError("Você não tem permissão para alterar esta tarefa.", 403);
}

export interface TaskUpdateInput {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  status?: TaskStatus;
  assigneeUserId?: number;
}

export async function updateTask(
  actingUserId: number,
  taskId: number,
  updates: TaskUpdateInput,
): Promise<TaskRecord> {
  const task = await getTaskOrThrow(taskId);
  assertCanMutateTask(actingUserId, task);

  // Only the responsible person, the creator, or the owner may reassign —
  // and the new assignee must belong to the same workspace.
  if (updates.assigneeUserId !== undefined && updates.assigneeUserId !== task.assignee_user_id) {
    await assertAssigneeInWorkspace(task.project_owner_id, updates.assigneeUserId);
  }

  if (updates.status && !["pending", "in_progress", "done"].includes(updates.status)) {
    throw new AppError("Status inválido.", 400);
  }

  const completedAt = updates.status === "done" ? new Date().toISOString() : undefined;

  let updated: TaskRecord;

  if (shouldUsePrisma) {
    const row = await prisma.task.update({
      where: { id: BigInt(taskId) },
      data: {
        ...(updates.title !== undefined && { title: updates.title.trim() }),
        ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
        ...(updates.dueDate !== undefined && { dueDate: updates.dueDate ? new Date(updates.dueDate) : null }),
        ...(updates.status !== undefined && { status: updates.status }),
        ...(updates.assigneeUserId !== undefined && { assigneeUserId: BigInt(updates.assigneeUserId) }),
        ...(completedAt !== undefined && { completedAt: new Date(completedAt) }),
        updatedAt: new Date(),
      },
    });
    updated = serializeTask(row);
  } else {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (updates.title !== undefined) { fields.push("title = ?"); values.push(updates.title.trim()); }
    if (updates.description !== undefined) { fields.push("description = ?"); values.push(updates.description?.trim() || null); }
    if (updates.dueDate !== undefined) { fields.push("due_date = ?"); values.push(updates.dueDate || null); }
    if (updates.status !== undefined) { fields.push("status = ?"); values.push(updates.status); }
    if (updates.assigneeUserId !== undefined) { fields.push("assignee_user_id = ?"); values.push(updates.assigneeUserId); }
    if (completedAt !== undefined) { fields.push("completed_at = ?"); values.push(completedAt); }
    fields.push("updated_at = datetime('now')");
    if (fields.length === 1) throw new AppError("Nada para atualizar.", 400);

    db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(...values, taskId);
    updated = serializeTask(db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId));
  }

  if (updates.assigneeUserId !== undefined && updates.assigneeUserId !== task.assignee_user_id) {
    notifyUser(
      updates.assigneeUserId,
      "Tarefa atribuída a você",
      `Uma tarefa foi reatribuída para você: ${updated.title}`,
      "task_assigned",
      `/project/${task.project_id}`,
    );
  }

  return updated;
}

export async function deleteTask(actingUserId: number, taskId: number): Promise<void> {
  const task = await getTaskOrThrow(taskId);
  assertCanMutateTask(actingUserId, task);

  if (shouldUsePrisma) {
    await prisma.task.delete({ where: { id: BigInt(taskId) } });
    return;
  }
  db.prepare("DELETE FROM tasks WHERE id = ?").run(taskId);
}
