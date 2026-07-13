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
  shot_number: string | null;
  scene: string;
  shot_type: string;
  description: string;
  camera: string;
  lens: string;
  movement: string;
  duration_sec: number | null;
  status: string;
  thumbnail_url: string | null;
  production_notes: string | null;
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
    shotNumber: "shot_number",
    shotType: "shot_type",
    durationSec: "duration_sec",
    thumbnailUrl: "thumbnail_url",
    productionNotes: "production_notes",
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
  shotNumber?: string | null;
  productionNotes?: string | null;
  thumbnailUrl?: string | null;
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
        shotNumber: data.shotNumber ?? null,
        productionNotes: data.productionNotes ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
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
      `INSERT INTO shots (shot_list_id, order_index, scene, shot_type, description, camera, lens, movement, duration_sec, shot_number, production_notes, thumbnail_url, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`,
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
      data.shotNumber ?? null,
      data.productionNotes ?? null,
      data.thumbnailUrl ?? null,
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
    shotNumber: "shot_number",
    productionNotes: "production_notes",
    thumbnailUrl: "thumbnail_url",
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

/**
 * Upload thumbnail for a shot to Supabase Storage.
 * Returns the storage URL.
 */
export async function uploadShotThumbnail(
  userId: number,
  shotId: number,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const shot = await getShotOwnedByUser(userId, shotId);

  // Import storage service
  const { uploadProjectFile, createProjectFileUrl } = await import("./supabaseStorage.js");

  // Get shot list ID to find project ID
  let projectId = 0;
  if (shouldUsePrisma) {
    const shotList = await prisma.shotList.findFirst({
      where: { id: shot.shotListId },
      select: { projectId: true },
    });
    projectId = shotList ? Number(shotList.projectId) : 0;
  } else {
    const shotList = db.prepare("SELECT project_id FROM shot_lists WHERE id = ?").get((shot as any).shot_list_id) as { project_id: number } | undefined;
    projectId = shotList?.project_id || 0;
  }

  // Generate storage path
  const ext = mimeType.split('/')[1] || 'jpg';
  const filename = `shot-${shotId}-${Date.now()}.${ext}`;
  const storagePath = `${userId}/${projectId}/thumbnails/${filename}`;

  // Upload to Supabase Storage
  await uploadProjectFile(storagePath, fileBuffer, mimeType);

  // Get signed URL (valid for 1 year for thumbnails)
  const thumbnailUrl = await createProjectFileUrl(storagePath, 31536000); // 1 year

  // Update shot with thumbnail URL
  if (shouldUsePrisma) {
    await prisma.shot.update({
      where: { id: BigInt(shotId) },
      data: { thumbnailUrl },
    });
  } else {
    db.prepare("UPDATE shots SET thumbnail_url = ? WHERE id = ?").run(thumbnailUrl, shotId);
  }

  return thumbnailUrl;
}

/**
 * Duplicate a shot (all fields except orderIndex).
 * New shot is appended at the end.
 */
export async function duplicateShot(userId: number, shotId: number): Promise<ShotRecord> {
  const originalShot = await getShotOwnedByUser(userId, shotId);

  if (shouldUsePrisma) {
    // Get max order index for this shot list
    const maxOrder = await prisma.shot.aggregate({
      where: { shotListId: originalShot.shotListId },
      _max: { orderIndex: true },
    });
    const nextOrder = (maxOrder._max.orderIndex ?? -1) + 1;

    // Create duplicate
    const duplicated = await prisma.shot.create({
      data: {
        shotListId: originalShot.shotListId,
        orderIndex: nextOrder,
        shotNumber: originalShot.shotNumber,
        scene: originalShot.scene,
        shotType: originalShot.shotType,
        description: originalShot.description,
        camera: originalShot.camera,
        lens: originalShot.lens,
        movement: originalShot.movement,
        durationSec: originalShot.durationSec,
        status: "pending", // Reset to pending
        thumbnailUrl: originalShot.thumbnailUrl,
        productionNotes: originalShot.productionNotes,
      },
    });
    return serializeShot(duplicated);
  }

  // SQLite path
  const shotListId = (originalShot as any).shot_list_id;
  const maxRow = db.prepare("SELECT MAX(order_index) as maxOrder FROM shots WHERE shot_list_id = ?").get(shotListId) as {
    maxOrder: number | null;
  };
  const nextOrder = (maxRow.maxOrder ?? -1) + 1;

  const original = originalShot as any;
  const result = db
    .prepare(
      `INSERT INTO shots (shot_list_id, order_index, shot_number, scene, shot_type, description, camera, lens, movement, duration_sec, status, thumbnail_url, production_notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, datetime('now'))`,
    )
    .run(
      shotListId,
      nextOrder,
      original.shot_number,
      original.scene,
      original.shot_type,
      original.description,
      original.camera,
      original.lens,
      original.movement,
      original.duration_sec,
      original.thumbnail_url,
      original.production_notes,
    );

  return serializeShot(db.prepare("SELECT * FROM shots WHERE id = ?").get((result as any).lastInsertRowid));
}

/**
 * Generate PDF export of shot list using jsPDF.
 * Returns PDF buffer.
 */
export async function generateShotListPdf(userId: number, projectId: number): Promise<Buffer> {
  const { shotList, shots } = await listShots(userId, projectId);

  // Get project name
  let projectName = "Projeto";
  if (shouldUsePrisma) {
    const project = await prisma.project.findFirst({
      where: { id: BigInt(projectId) },
      select: { name: true },
    });
    if (project) projectName = project.name;
  } else {
    const project = db.prepare("SELECT name FROM projects WHERE id = ?").get(projectId) as { name: string } | undefined;
    if (project) projectName = project.name;
  }

  // Dynamic import of jsPDF
  const jsPDF = (await import("jspdf")).default;
  const doc = new jsPDF();

  // Title page
  doc.setFontSize(20);
  doc.text("SHOT LIST", 105, 30, { align: "center" });
  doc.setFontSize(14);
  doc.text(projectName, 105, 40, { align: "center" });
  doc.setFontSize(10);
  doc.text(new Date().toLocaleDateString('pt-BR'), 105, 50, { align: "center" });

  // Summary
  doc.setFontSize(10);
  doc.text(`Total de planos: ${shots.length}`, 20, 70);
  const totalDuration = shots.reduce((sum, s) => sum + (s.duration_sec || 0), 0);
  const totalMinutes = Math.round(totalDuration / 60);
  doc.text(`Duração estimada: ${totalMinutes} minutos`, 20, 76);

  // Group by scene
  const grouped: Record<string, typeof shots> = {};
  for (const shot of shots) {
    const scene = shot.scene || "Sem cena";
    if (!grouped[scene]) grouped[scene] = [];
    grouped[scene].push(shot);
  }

  let yPos = 90;
  let pageNum = 1;

  for (const [scene, sceneShots] of Object.entries(grouped)) {
    // Scene header
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
      pageNum++;
    }

    doc.setFontSize(12);
    doc.setFont(undefined, "bold");
    doc.text(`CENA: ${scene}`, 20, yPos);
    yPos += 8;

    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    for (const shot of sceneShots) {
      // Check if need new page
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
        pageNum++;
      }

      // Shot header
      const shotHeader = [
        shot.shot_number && `#${shot.shot_number}`,
        shot.shot_type && `[${shot.shot_type}]`,
        shot.status === "shot" ? "✓ FILMADO" : "○ Pendente"
      ].filter(Boolean).join(" · ");

      doc.setFont(undefined, "bold");
      doc.text(shotHeader, 20, yPos);
      yPos += 5;

      // Description
      doc.setFont(undefined, "normal");
      doc.text(`Descrição: ${shot.description || "—"}`, 20, yPos);
      yPos += 5;

      // Technical specs
      const specs = [
        shot.camera && `Câmera: ${shot.camera}`,
        shot.lens && `Lente: ${shot.lens}`,
        shot.movement && `Movimento: ${shot.movement}`,
        shot.duration_sec && `Duração: ${Math.round(shot.duration_sec / 60)}min`
      ].filter(Boolean).join(" | ");

      if (specs) {
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(specs, 20, yPos);
        doc.setTextColor(0);
        doc.setFontSize(9);
        yPos += 5;
      }

      // Production notes
      if (shot.production_notes) {
        doc.setTextColor(80);
        const lines = doc.splitTextToSize(`Notas: ${shot.production_notes}`, 170);
        doc.text(lines, 20, yPos);
        yPos += lines.length * 4;
        doc.setTextColor(0);
      }

      yPos += 4; // Space between shots
    }

    yPos += 6; // Space between scenes
  }

  // Footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`${projectName} - Shot List`, 20, 287);
    doc.text(`Página ${i} de ${totalPages}`, 170, 287);
    doc.setTextColor(0);
  }

  // Convert to buffer
  const pdfData = doc.output("arraybuffer");
  return Buffer.from(pdfData);
}
