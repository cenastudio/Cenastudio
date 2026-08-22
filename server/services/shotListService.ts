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

  // Check shot limit based on plan
  const { getUserEntitlements } = await import("./entitlementService.js");
  const entitlement = await getUserEntitlements(userId);
  const shotLimit = entitlement.shotListLimit;

  // Count existing shots
  let currentShotCount = 0;
  if (shouldUsePrisma) {
    currentShotCount = await prisma.shot.count({
      where: { shotListId: BigInt(shotList.id) },
    });
  } else {
    const result = db.prepare("SELECT COUNT(*) as count FROM shots WHERE shot_list_id = ?").get(shotList.id) as { count: number };
    currentShotCount = result.count;
  }

  // Enforce limit (unless unlimited = -1)
  if (shotLimit !== -1 && currentShotCount >= shotLimit) {
    const planName = entitlement.planId === "free" ? "Free" : entitlement.planId === "pro" ? "Pro" : "Studio";
    throw new AppError(
      `Limite de ${shotLimit} shots atingido no plano ${planName}. Faça upgrade para adicionar mais shots.`,
      403
    );
  }

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
 * Upload thumbnail for a shot to Cloudinary.
 * Returns the Cloudinary URL.
 */
export async function uploadShotThumbnail(
  userId: number,
  shotId: number,
  fileBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const shot = await getShotOwnedByUser(userId, shotId);

  // The cloudinary v2 SDK only auto-configures itself from a single
  // CLOUDINARY_URL env var (cloudinary://key:secret@cloud_name) — it does
  // NOT read CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
  // automatically on import, even though those are the three vars documented
  // and actually set in Railway. Without this explicit .config() call,
  // uploads fail with "Must supply api_key" regardless of what's in the
  // environment.
  const cloudinary = (await import("cloudinary")).v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  if (!cloudinary.config().api_key) {
    throw new AppError(
      "Upload de thumbnail indisponível: Cloudinary não está configurado (CLOUDINARY_API_KEY ausente).",
      503,
    );
  }

  // Upload to Cloudinary with transformation
  const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "shotlist-thumbnails",
        transformation: [
          { width: 400, height: 300, crop: "fill" },
          { quality: "auto:good" },
          { fetch_format: "auto" },
        ],
        resource_type: "image",
      },
      (error, result) => {
        if (error) reject(error);
        else if (result) resolve(result);
        else reject(new Error("Upload failed"));
      }
    );
    uploadStream.end(fileBuffer);
  });

  const thumbnailUrl = uploadResult.secure_url;

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
/**
 * Fetches a remote image and returns it as a base64 data URL plus the jsPDF
 * image format. Server-side jsPDF can't resolve a remote URL on its own
 * (there's no DOM/Image), so thumbnails must be embedded as data. Returns
 * null on any failure so the caller can fall back to a placeholder.
 */
async function fetchImageForPdf(url: string): Promise<{ dataUrl: string; format: "PNG" | "JPEG" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "";
    const isPng = contentType.includes("png") || /\.png($|\?)/i.test(url);
    const format = isPng ? "PNG" : "JPEG";
    const mime = isPng ? "image/png" : "image/jpeg";
    const buffer = Buffer.from(await res.arrayBuffer());
    return { dataUrl: `data:${mime};base64,${buffer.toString("base64")}`, format };
  } catch {
    return null;
  }
}

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

  // Dynamic import of jsPDF. jspdf's constructor is the *named* export
  // `jsPDF`; its `.default` is a plain object (not callable), so
  // `new (await import("jspdf")).default()` throws "jsPDF2 is not a
  // constructor" once bundled. Destructure the named export instead.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();

  const totalDuration = shots.reduce((sum, s) => sum + (s.duration_sec || 0), 0);
  const totalMinutes = Math.round(totalDuration / 60);

  // Title page
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("SHOT LIST", 105, 60, { align: "center" });

  doc.setFontSize(16);
  doc.setFont("helvetica", "normal");
  doc.text(projectName, 105, 75, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' }), 105, 90, { align: "center" });

  doc.setFontSize(10);
  doc.text(`${shots.length} planos · ${totalMinutes} minutos estimados`, 105, 100, { align: "center" });
  doc.setTextColor(0);

  // Draw decorative line
  doc.setDrawColor(255, 107, 0); // frame-orange
  doc.setLineWidth(0.5);
  doc.line(60, 110, 150, 110);

  // ONE PAGE PER SHOT (professional format for set use)
  for (let i = 0; i < shots.length; i++) {
    const shot = shots[i];
    doc.addPage();

    // Header with shot number
    doc.setFillColor(255, 107, 0); // frame-orange
    doc.rect(0, 0, 210, 25, "F");

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    const shotTitle = shot.shot_number ? `PLANO ${shot.shot_number}` : `PLANO ${i + 1}`;
    doc.text(shotTitle, 20, 15);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (shot.scene) {
      doc.text(`Cena: ${shot.scene}`, 150, 12);
    }
    if (shot.shot_type) {
      doc.text(`Tipo: ${shot.shot_type}`, 150, 18);
    }

    doc.setTextColor(0);

    let y = 35;

    // Thumbnail (large, centered) if available. Fetch + embed as data URL,
    // since server-side jsPDF can't load a remote URL directly.
    if (shot.thumbnail_url) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 107, 0);
      doc.text("STORYBOARD / THUMBNAIL APROVADO", 105, y - 4, { align: "center" });
      doc.setTextColor(0);

      const image = await fetchImageForPdf(shot.thumbnail_url);
      let added = false;
      if (image) {
        try {
          doc.addImage(image.dataUrl, image.format, 45, y, 120, 90);
          added = true;
        } catch {
          added = false;
        }
      }
      if (!added) {
        // Fetch/decode failed — draw a placeholder box instead.
        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.rect(45, y, 120, 90);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Storyboard/thumbnail indisponível", 105, y + 45, { align: "center" });
        doc.text("Referência visual aprovada, mas a imagem não carregou no PDF.", 105, y + 51, { align: "center" });
        doc.setTextColor(0);
      }
      y += 95;
    }

    // Description box
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("DESCRIÇÃO:", 20, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const descLines = doc.splitTextToSize(shot.description || "—", 170);
    doc.text(descLines, 20, y);
    y += descLines.length * 6 + 5;

    // Technical specs in a box
    doc.setDrawColor(200);
    doc.setLineWidth(0.3);
    doc.rect(20, y, 170, 30);

    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("ESPECIFICAÇÕES TÉCNICAS:", 22, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (shot.camera) {
      doc.text(`Câmera: ${shot.camera}`, 22, y);
      y += 5;
    }
    if (shot.lens) {
      doc.text(`Lente: ${shot.lens}`, 22, y);
      y += 5;
    }
    if (shot.movement) {
      doc.text(`Movimento: ${shot.movement}`, 22, y);
      y += 5;
    }
    if (shot.duration_sec) {
      doc.text(`Duração estimada: ${Math.round(shot.duration_sec / 60)} minutos`, 22, y);
      y += 5;
    }

    y += 3;

    // Production notes
    if (shot.production_notes) {
      y += 3;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("NOTAS DE PRODUÇÃO:", 20, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(60);
      const notesLines = doc.splitTextToSize(shot.production_notes, 170);
      doc.text(notesLines, 20, y);
      doc.setTextColor(0);
      y += notesLines.length * 5 + 5;
    }

    // Space for handwritten notes on set
    if (y < 230) {
      doc.setDrawColor(220);
      doc.setLineWidth(0.2);
      doc.rect(20, 230, 170, 45);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text("NOTAS DE SET (espaço para anotações durante filmagem):", 22, 227);
      doc.setTextColor(0);
    }

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.text(`${projectName}`, 20, 287);
    doc.text(`Plano ${i + 1} de ${shots.length}`, 105, 287, { align: "center" });
    doc.text(shot.status === "shot" ? "✓ FILMADO" : "○ PENDENTE", 180, 287, { align: "right" });
    doc.setTextColor(0);
  }

  // Convert to buffer
  const pdfData = doc.output("arraybuffer");
  return Buffer.from(pdfData);
}
