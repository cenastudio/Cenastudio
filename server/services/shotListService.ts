import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

/**
 * Shot List (spec: landing-features-implementation, F3).
 *
 * One ShotList per project (created lazily), with an ordered list of Shot
 * rows. reorderShots keeps orderIndex contiguous (0..n-1) and reflecting the
 * exact order received in orderedIds (Property 5, design.md).
 */

export interface ShotRecord {
  id: number;
  shot_list_id: number;
  order_index: number;
  scene: string;
  shot_type: string;
  description: string;
  camera: string;
  lens: string;
  movement: string;
  duration_sec: number | null;
  status: string;
  created_at: string;
}

export interface ShotListRecord {
  id: number;
  user_id: number;
  project_id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

function serializeShotList(value: any): ShotListRecord {
  return withSnakeCase(value, {
    userId: "user_id",
    projectId: "project_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  }) as unknown as ShotListRecord;
}

function serializeShot(value: any): ShotRecord {
  return withSnakeCase(value, {
    shotListId: "shot_list_id",
    orderIndex: "order_index",
    shotType: "shot_type",
    durationSec: "duration_sec",
    createdAt: "created_at",
  }) as unknown as ShotRecord;
}

async function assertProjectOwnership(userId: number, projectId: number): Promise<void> {
  if (shouldUsePrisma) {
    const project = await prisma.project.findFirst({
      where: { id: BigInt(projectId), userId: BigInt(userId) },
      select: { id: true },
    });
    if (!project) throw new AppError("Projeto não encontrado", 404);
    return;
  }
  const project = db.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?").get(projectId, userId);
  if (!project) throw new AppError("Projeto não encontrado", 404);
}

export async function getOrCreateForProject(userId: number, projectId: number): Promise<ShotListRecord> {
  await assertProjectOwnership(userId, projectId);

  if (shouldUsePrisma) {
    const existing = await prisma.shotList.findFirst({ where: { projectId: BigInt(projectId) } });
    if (existing) return serializeShotList(existing);
    const created = await prisma.shotList.create({ data: { userId: BigInt(userId), projectId: BigInt(projectId) } });
    return serializeShotList(created);
  }

  const existing = db.prepare("SELECT * FROM shot_lists WHERE project_id = ?").get(projectId);
  if (existing) return serializeShotList(existing);

  const result = db
    .prepare("INSERT INTO shot_lists (user_id, project_id, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))")
    .run(userId, projectId);
  return serializeShotList(db.prepare("SELECT * FROM shot_lists WHERE id = ?").get((result as any).lastInsertRowid));
}

async function getShotListOwnedByUser(userId: number, shotListId: number) {
  if (shouldUsePrisma) {
    const shotList = await prisma.shotList.findFirst({ where: { id: BigInt(shotListId), userId: BigInt(userId) } });
    if (!shotList) throw new AppError("Shot list não encontrada", 404);
    return shotList;
  }
  const shotList = db.prepare("SELECT * FROM shot_lists WHERE id = ? AND user_id = ?").get(shotListId, userId);
  if (!shotList) throw new AppError("Shot list não encontrada", 404);
  return shotList;
}

export async function listShots(userId: number, projectId: number): Promise<{ shotList: ShotListRecord; shots: ShotRecord[] }> {
  const shotList = await getOrCreateForProject(userId, projectId);

  if (shouldUsePrisma) {
    const rows = await prisma.shot.findMany({
      where: { shotListId: BigInt(shotList.id) },
      orderBy: { orderIndex: "asc" },
    });
    return { shotList, shots: rows.map(serializeShot) };
  }

  const rows = db.prepare("SELECT * FROM shots WHERE shot_list_id = ? ORDER BY order_index ASC").all(shotList.id);
  return { shotList, shots: (rows as any[]).map(serializeShot) };
}

export interface ShotInput {
  scene?: string;
  shotType?: string;
  description?: string;
  camera?: string;
  lens?: string;
  movement?: string;
  durationSec?: number | null;
}

/** Appends a new shot at the end of the list (orderIndex = current max + 1). */
export async function addShot(userId: number, projectId: number, data: ShotInput): Promise<ShotRecord> {
  const shotList = await getOrCreateForProject(userId, projectId);

  if (shouldUsePrisma) {
    const maxOrder = await prisma.shot.aggregate({
      where: { shotListId: BigInt(shotList.id) },
      _max: { orderIndex: true },
    });
    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;
    const created = await prisma.shot.create({
      data: {
        shotListId: BigInt(shotList.id),
        orderIndex: nextOrder,
        scene: data.scene ?? "",
        shotType: data.shotType ?? "",
        description: data.description ?? "",
        camera: data.camera ?? "",
        lens: data.lens ?? "",
        movement: data.movement ?? "",
        durationSec: data.durationSec ?? null,
      },
    });
    return serializeShot(created);
  }

  const maxRow = db.prepare("SELECT MAX(order_index) as maxOrder FROM shots WHERE shot_list_id = ?").get(shotList.id) as {
    maxOrder: number | null;
  };
  const nextOrder = (maxRow.maxOrder ?? -1) + 1;

  const result = db
    .prepare(
      `INSERT INTO shots (shot_list_id, order_index, scene, shot_type, description, camera, lens, movement, duration_sec, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
    )
    .run(
      shotList.id,
      nextOrder,
      data.scene ?? "",
      data.shotType ?? "",
      data.description ?? "",
      data.camera ?? "",
      data.lens ?? "",
      data.movement ?? "",
      data.durationSec ?? null,
    );

  return serializeShot(db.prepare("SELECT * FROM shots WHERE id = ?").get((result as any).lastInsertRowid));
}

/** Ownership check for a single shot, scoped through its parent shot list's userId. */
async function getShotOwnedByUser(userId: number, shotId: number) {
  if (shouldUsePrisma) {
    const shot = await prisma.shot.findFirst({
      where: { id: BigInt(shotId), shotList: { userId: BigInt(userId) } },
    });
    if (!shot) throw new AppError("Plano não encontrado", 404);
    return shot;
  }
  const shot = db
    .prepare(
      `SELECT s.* FROM shots s JOIN shot_lists sl ON sl.id = s.shot_list_id WHERE s.id = ? AND sl.user_id = ?`,
    )
    .get(shotId, userId);
  if (!shot) throw new AppError("Plano não encontrado", 404);
  return shot;
}

export async function updateShot(
  userId: number,
  shotId: number,
  data: Partial<ShotInput> & { status?: string },
): Promise<ShotRecord> {
  await getShotOwnedByUser(userId, shotId);
  if (data.status && data.status !== "pending" && data.status !== "shot") {
    throw new AppError("Status inválido", 400);
  }

  if (shouldUsePrisma) {
    const updated = await prisma.shot.update({ where: { id: BigInt(shotId) }, data });
    return serializeShot(updated);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  const fieldMap: Record<string, string> = {
    scene: "scene",
    shotType: "shot_type",
    description: "description",
    camera: "camera",
    lens: "lens",
    movement: "movement",
    durationSec: "duration_sec",
    status: "status",
  };
  for (const [key, column] of Object.entries(fieldMap)) {
    const value = (data as Record<string, unknown>)[key];
    if (value !== undefined) {
      fields.push(`${column} = ?`);
      values.push(value);
    }
  }
  if (fields.length === 0) throw new AppError("Nada para atualizar", 400);

  db.prepare(`UPDATE shots SET ${fields.join(", ")} WHERE id = ?`).run(...values, shotId);
  return serializeShot(db.prepare("SELECT * FROM shots WHERE id = ?").get(shotId));
}

export async function deleteShot(userId: number, shotId: number): Promise<boolean> {
  await getShotOwnedByUser(userId, shotId);

  if (shouldUsePrisma) {
    await prisma.shot.delete({ where: { id: BigInt(shotId) } });
    return true;
  }
  db.prepare("DELETE FROM shots WHERE id = ?").run(shotId);
  return true;
}

/**
 * Reorders shots so orderIndex is contiguous (0..n-1) and reflects the exact
 * order in orderedIds (Property 5, design.md). All-or-nothing per shot list —
 * every id in orderedIds must belong to this list, or the whole call fails.
 */
export async function reorderShots(userId: number, projectId: number, orderedIds: number[]): Promise<ShotRecord[]> {
  const { shotList, shots } = await listShots(userId, projectId);
  const existingIds = new Set(shots.map((s) => s.id));

  if (orderedIds.length !== shots.length || orderedIds.some((id) => !existingIds.has(id))) {
    throw new AppError("Lista de ordenação inválida — não corresponde aos planos existentes", 400);
  }

  if (shouldUsePrisma) {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.shot.update({ where: { id: BigInt(id) }, data: { orderIndex: index } }),
      ),
    );
  } else {
    const update = db.prepare("UPDATE shots SET order_index = ? WHERE id = ?");
    const runAll = db.transaction((ids: number[]) => {
      ids.forEach((id, index) => update.run(index, id));
    });
    runAll(orderedIds);
  }

  const { shots: reordered } = await listShots(userId, projectId);
  void shotList; // shotList already validated ownership via listShots above
  return reordered;
}
