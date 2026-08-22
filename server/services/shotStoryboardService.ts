import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import {
  generateStoryboardImage,
  sanitizeImageGenerationError,
  type GenerateImageInput,
} from "./imageGenerationService.js";
import { getUserEntitlements } from "./entitlementService.js";

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

export interface GenerateStoryboardFrameInput {
  prompt: string;
  aspectRatio?: GenerateImageInput["aspectRatio"];
}

interface ShotStoryboardContext {
  shotId: number;
  projectId: number;
  scene: string;
  shotType: string;
  description: string;
  camera: string;
  lens: string;
  movement: string;
  productionNotes: string | null;
}

interface StoryboardGenerationAllowance {
  planId: string;
  period: string;
  used: number;
  limit: number;
  remaining: number | null;
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

async function getShotContextOwnedByUser(userId: number, shotId: number): Promise<ShotStoryboardContext> {
  if (shouldUsePrisma) {
    const shot = await prisma.shot.findFirst({
      where: { id: BigInt(shotId), shotList: { userId: BigInt(userId) } },
      select: {
        id: true,
        scene: true,
        shotType: true,
        description: true,
        camera: true,
        lens: true,
        movement: true,
        productionNotes: true,
        shotList: { select: { projectId: true } },
      },
    });
    if (!shot) throw new AppError("Plano não encontrado", 404);
    return {
      shotId: Number(shot.id),
      projectId: Number(shot.shotList.projectId),
      scene: shot.scene,
      shotType: shot.shotType,
      description: shot.description,
      camera: shot.camera,
      lens: shot.lens,
      movement: shot.movement,
      productionNotes: shot.productionNotes,
    };
  }

  const shot = db
    .prepare(
      `SELECT s.id AS shot_id, sl.project_id, s.scene, s.shot_type, s.description, s.camera, s.lens, s.movement, s.production_notes
       FROM shots s
       JOIN shot_lists sl ON sl.id = s.shot_list_id
       WHERE s.id = ? AND sl.user_id = ?`,
    )
    .get(shotId, userId) as
    | {
        shot_id: number;
        project_id: number;
        scene: string;
        shot_type: string;
        description: string;
        camera: string;
        lens: string;
        movement: string;
        production_notes: string | null;
      }
    | undefined;
  if (!shot) throw new AppError("Plano não encontrado", 404);
  return {
    shotId: shot.shot_id,
    projectId: shot.project_id,
    scene: shot.scene,
    shotType: shot.shot_type,
    description: shot.description,
    camera: shot.camera,
    lens: shot.lens,
    movement: shot.movement,
    productionNotes: shot.production_notes,
  };
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

function getCurrentPeriodRange() {
  const now = new Date();
  const period = now.toISOString().slice(0, 7);
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { period, monthStart, nextMonth };
}

async function shouldBypassStoryboardQuota(userId: number): Promise<boolean> {
  if (shouldUsePrisma) {
    const user = await prisma.user.findUnique({ where: { id: BigInt(userId) }, select: { role: true } });
    return user?.role === "admin";
  }
  const user = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as { role: string } | undefined;
  return user?.role === "admin";
}

export async function getStoryboardGenerationAllowance(userId: number): Promise<StoryboardGenerationAllowance> {
  const entitlement = await getUserEntitlements(userId);
  const { period, monthStart, nextMonth } = getCurrentPeriodRange();
  const statuses = ["generated", "approved"];

  const used = shouldUsePrisma
    ? await prisma.shotStoryboardFrame.count({
        where: {
          userId: BigInt(userId),
          status: { in: statuses },
          createdAt: { gte: monthStart, lt: nextMonth },
        },
      })
    : (
        db.prepare(
          `SELECT COUNT(*) AS count
           FROM shot_storyboard_frames
           WHERE user_id = ?
             AND status IN ('generated', 'approved')
             AND strftime('%Y-%m', created_at) = ?`,
        ).get(userId, period) as { count: number }
      ).count;

  const limit = entitlement.storyboardGenerationLimit;
  return {
    planId: entitlement.planId,
    period,
    used,
    limit,
    remaining: limit < 0 ? null : Math.max(0, limit - used),
  };
}

export async function assertStoryboardGenerationCapacity(userId: number): Promise<StoryboardGenerationAllowance> {
  if (await shouldBypassStoryboardQuota(userId)) {
    const { period } = getCurrentPeriodRange();
    return { planId: "admin", period, used: 0, limit: -1, remaining: null };
  }

  const allowance = await getStoryboardGenerationAllowance(userId);
  if (allowance.limit < 0) return allowance;
  if (allowance.used >= allowance.limit) {
    throw new AppError(
      `Limite mensal de storyboard atingido no plano ${allowance.planId.toUpperCase()} (${allowance.limit}/mês). O plano não foi gerado; faça upgrade ou aguarde o próximo ciclo.`,
      429,
    );
  }
  return allowance;
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

function buildFinalPrompt(context: ShotStoryboardContext, prompt: string): string {
  const parts = [
    "Style: black and white pencil storyboard sketch, clear cinematic composition, rough production planning frame, not a polished advertising render.",
    `User intent: ${prompt}`,
    context.scene ? `Scene: ${context.scene}` : "",
    context.shotType ? `Shot type: ${context.shotType}` : "",
    context.description ? `Shot description: ${context.description}` : "",
    context.camera ? `Camera: ${context.camera}` : "",
    context.lens ? `Lens: ${context.lens}` : "",
    context.movement ? `Movement: ${context.movement}` : "",
    context.productionNotes ? `Production notes: ${context.productionNotes}` : "",
    "Avoid text, logos, watermarks, gore, nudity, or identifiable real people unless explicitly provided by the user.",
  ];
  return parts.filter(Boolean).join("\n");
}

export async function generateFrame(
  userId: number,
  shotId: number,
  input: GenerateStoryboardFrameInput,
): Promise<StoryboardFrameRecord> {
  const context = await getShotContextOwnedByUser(userId, shotId);
  const prompt = normalizeRequiredText(input.prompt, "Prompt");
  const aspectRatio = input.aspectRatio ?? "16:9";
  const finalPrompt = buildFinalPrompt(context, prompt);
  await assertStoryboardGenerationCapacity(userId);

  try {
    const result = await generateStoryboardImage({
      prompt: finalPrompt,
      style: "storyboard-pencil",
      aspectRatio,
    });
    return createFrame(userId, shotId, {
      prompt,
      finalPrompt,
      provider: result.provider,
      model: result.model ?? null,
      imageUrl: result.imageUrl ?? null,
      status: "generated",
    });
  } catch (error) {
    const errorMessage = sanitizeImageGenerationError(error);
    await createFrame(userId, shotId, {
      prompt,
      finalPrompt,
      provider: process.env.STORYBOARD_IMAGE_PROVIDER?.trim().toLowerCase() || "unconfigured",
      status: "failed",
      errorMessage,
    });
    throw error;
  }
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
