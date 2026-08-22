import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

export const STORYBOARD_FRAME_STATUSES = ["queued", "generating", "generated", "approved", "failed"] as const;
export type StoryboardFrameStatus = (typeof STORYBOARD_FRAME_STATUSES)[number];

export interface StoryboardFrameRecord {
  id: number;
  user_id: number;
  project_id: number;
  shot_id: number;
  prompt: string;
  final_prompt: string;
  provider: string;
  model: string | null;
  image_url: string | null;
  storage_path: string | null;
  status: StoryboardFrameStatus | string;
  error_message: string | null;
  revision: number;
  approved_at: string | null;
  approved_by_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStoryboardFrameInput {
  prompt: string;
  finalPrompt: string;
  provider: string;
  model?: string | null;
  imageUrl?: string | null;
  storagePath?: string | null;
  status?: StoryboardFrameStatus;
  errorMessage?: string | null;
}

function serializeFrame(value: any): StoryboardFrameRecord {
  return withSnakeCase(value, {
    userId: "user_id",
    projectId: "project_id",
    shotId: "shot_id",
    finalPrompt: "final_prompt",
    imageUrl: "image_url",
    storagePath: "storage_path",
    errorMessage: "error_message",
    approvedAt: "approved_at",
    approvedById: "approved_by_id",
    createdAt: "created_at",
    updatedAt: "updated_at",
  }) as unknown as StoryboardFrameRecord;
}

function normalizeRequiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new AppError(`${label} é obrigatório`, 400);
  return value.trim();
}

function normalizeOptionalText(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new AppError("Texto inválido", 400);
  return value.trim() || null;
}

function normalizeStatus(value: unknown): StoryboardFrameStatus {
  const status = value ?? "queued";
  if (!STORYBOARD_FRAME_STATUSES.includes(status as StoryboardFrameStatus)) {
    throw new AppError("Status de storyboard inválido", 400);
  }
  return status as StoryboardFrameStatus;
}

async function getShotContextOwnedByUser(userId: number, shotId: number): Promise<{ shotId: number; projectId: number }> {
  if (shouldUsePrisma) {
    const shot = await prisma.shot.findFirst({
      where: { id: BigInt(shotId), shotList: { userId: BigInt(userId) } },
      select: { id: true, shotList: { select: { projectId: true } } },
    });
    if (!shot) throw new AppError("Plano não encontrado", 404);
    return { shotId: Number(shot.id), projectId: Number(shot.shotList.projectId) };
  }

  const shot = db
    .prepare(
      `SELECT s.id AS shot_id, sl.project_id
       FROM shots s
       JOIN shot_lists sl ON sl.id = s.shot_list_id
       WHERE s.id = ? AND sl.user_id = ?`,
    )
    .get(shotId, userId) as { shot_id: number; project_id: number } | undefined;
  if (!shot) throw new AppError("Plano não encontrado", 404);
  return { shotId: shot.shot_id, projectId: shot.project_id };
}

async function getFrameOwnedByUser(userId: number, frameId: number): Promise<StoryboardFrameRecord> {
  if (shouldUsePrisma) {
    const frame = await prisma.shotStoryboardFrame.findFirst({
      where: { id: BigInt(frameId), userId: BigInt(userId) },
    });
    if (!frame) throw new AppError("Frame de storyboard não encontrado", 404);
    return serializeFrame(frame);
  }

  const frame = db
    .prepare("SELECT * FROM shot_storyboard_frames WHERE id = ? AND user_id = ?")
    .get(frameId, userId);
  if (!frame) throw new AppError("Frame de storyboard não encontrado", 404);
  return serializeFrame(frame);
}

export async function listFrames(userId: number, shotId: number): Promise<StoryboardFrameRecord[]> {
  await getShotContextOwnedByUser(userId, shotId);

  if (shouldUsePrisma) {
    const frames = await prisma.shotStoryboardFrame.findMany({
      where: { shotId: BigInt(shotId), userId: BigInt(userId) },
      orderBy: [{ revision: "desc" }, { createdAt: "desc" }],
    });
    return frames.map(serializeFrame);
  }

  return (
    db
      .prepare(
        `SELECT * FROM shot_storyboard_frames
         WHERE shot_id = ? AND user_id = ?
         ORDER BY revision DESC, created_at DESC`,
      )
      .all(shotId, userId) as any[]
  ).map(serializeFrame);
}

export async function createFrame(
  userId: number,
  shotId: number,
  input: CreateStoryboardFrameInput,
): Promise<StoryboardFrameRecord> {
  const context = await getShotContextOwnedByUser(userId, shotId);
  const prompt = normalizeRequiredText(input.prompt, "Prompt");
  const finalPrompt = normalizeRequiredText(input.finalPrompt, "Prompt final");
  const provider = normalizeRequiredText(input.provider, "Provider");
  const model = normalizeOptionalText(input.model);
  const imageUrl = normalizeOptionalText(input.imageUrl);
  const storagePath = normalizeOptionalText(input.storagePath);
  const errorMessage = normalizeOptionalText(input.errorMessage);
  const status = normalizeStatus(input.status);

  if (shouldUsePrisma) {
    const maxRevision = await prisma.shotStoryboardFrame.aggregate({
      where: { shotId: BigInt(context.shotId), userId: BigInt(userId) },
      _max: { revision: true },
    });
    const created = await prisma.shotStoryboardFrame.create({
      data: {
        userId: BigInt(userId),
        projectId: BigInt(context.projectId),
        shotId: BigInt(context.shotId),
        prompt,
        finalPrompt,
        provider,
        model,
        imageUrl,
        storagePath,
        status,
        errorMessage,
        revision: (maxRevision._max.revision ?? 0) + 1,
      },
    });
    return serializeFrame(created);
  }

  const maxRow = db
    .prepare("SELECT MAX(revision) AS max_revision FROM shot_storyboard_frames WHERE shot_id = ? AND user_id = ?")
    .get(context.shotId, userId) as { max_revision: number | null };
  const revision = (maxRow.max_revision ?? 0) + 1;

  const result = db
    .prepare(
      `INSERT INTO shot_storyboard_frames
        (user_id, project_id, shot_id, prompt, final_prompt, provider, model, image_url, storage_path, status, error_message, revision, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    )
    .run(
      userId,
      context.projectId,
      context.shotId,
      prompt,
      finalPrompt,
      provider,
      model,
      imageUrl,
      storagePath,
      status,
      errorMessage,
      revision,
    );

  return serializeFrame(db.prepare("SELECT * FROM shot_storyboard_frames WHERE id = ?").get((result as any).lastInsertRowid));
}

export async function approveFrame(userId: number, frameId: number): Promise<StoryboardFrameRecord> {
  const frame = await getFrameOwnedByUser(userId, frameId);
  if (!frame.image_url) throw new AppError("Frame sem imagem não pode ser aprovado", 400);

  if (shouldUsePrisma) {
    const approved = await prisma.$transaction(async (tx) => {
      const updated = await tx.shotStoryboardFrame.update({
        where: { id: BigInt(frameId) },
        data: { status: "approved", approvedAt: new Date(), approvedById: BigInt(userId) },
      });
      await tx.shot.update({
        where: { id: BigInt(frame.shot_id) },
        data: { thumbnailUrl: frame.image_url },
      });
      return updated;
    });
    return serializeFrame(approved);
  }

  const runApprove = db.transaction(() => {
    db.prepare(
      `UPDATE shot_storyboard_frames
       SET status = 'approved', approved_at = datetime('now'), approved_by_id = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`,
    ).run(userId, frameId, userId);
    db.prepare("UPDATE shots SET thumbnail_url = ? WHERE id = ?").run(frame.image_url, frame.shot_id);
  });
  runApprove();

  return serializeFrame(db.prepare("SELECT * FROM shot_storyboard_frames WHERE id = ?").get(frameId));
}

export async function deleteFrame(userId: number, frameId: number): Promise<boolean> {
  await getFrameOwnedByUser(userId, frameId);

  if (shouldUsePrisma) {
    const result = await prisma.shotStoryboardFrame.deleteMany({
      where: { id: BigInt(frameId), userId: BigInt(userId) },
    });
    return result.count > 0;
  }

  const result = db.prepare("DELETE FROM shot_storyboard_frames WHERE id = ? AND user_id = ?").run(frameId, userId);
  return (result as any).changes > 0;
}
