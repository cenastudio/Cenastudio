import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import fs from "fs";
import { safeStoredFilePath } from "../utils/fileSafety.js";
import { notifyUser } from "../services/notificationService.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import { createProjectFileUrl } from "../services/supabaseStorage.js";

function serializeComment(value: any) {
  return withSnakeCase(value, {
    reviewId: "review_id", userId: "user_id", authorName: "author_name",
    timestampSeconds: "timestamp_seconds", createdAt: "created_at", updatedAt: "updated_at",
  });
}

function serializeReview(value: any) {
  const result = withSnakeCase(value, {
    projectId: "project_id", fileId: "file_id", userId: "user_id",
    shareToken: "share_token", expiresAt: "expires_at", videoUrl: "video_url",
    createdAt: "created_at", updatedAt: "updated_at",
  }) as any;
  if (result.file) {
    result.original_name = result.file.originalName;
    result.file_path = result.file.path;
    result.mime_type = result.file.mimeType;
    delete result.file;
  }
  if (result.project) {
    result.project_name = result.project.name;
    delete result.project;
  }
  if (result.comments) result.comments = result.comments.map(serializeComment);
  return result;
}

interface StatelessReviewToken {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  projectName: string;
  expiresAt: string;
}

function getClientOrigin() {
  return process.env.CLIENT_ORIGIN || "http://localhost:5173";
}

function getTokenSecret() {
  return process.env.JWT_SECRET || "cena-studio-dev-secret";
}

function encodeBase64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function signPayload(payload: string) {
  return createHmac("sha256", getTokenSecret()).update(payload).digest("base64url");
}

function createStatelessReviewToken(payload: StatelessReviewToken) {
  const body = encodeBase64Url(JSON.stringify(payload));
  return `sr_${body}.${signPayload(body)}`;
}

function parseStatelessReviewToken(token: string): StatelessReviewToken | null {
  if (!token.startsWith("sr_")) return null;
  const [body, signature] = token.slice(3).split(".");
  if (!body || !signature) return null;
  const expected = signPayload(body);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as StatelessReviewToken;
    if (!payload.videoUrl || !payload.title || !payload.expiresAt) return null;
    return payload;
  } catch {
    return null;
  }
}

function createShareData(review: {
  id: number;
  title: string;
  description?: string | null;
  video_url?: string | null;
  project_name?: string | null;
}, expiresInDays = 7) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  const token = randomBytes(32).toString("hex");

  return {
    shareToken: token,
    shareUrl: `${getClientOrigin()}/review/${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

function reviewLink(review: { project_id?: number | null; id: number }) {
  return review.project_id
    ? `/project/${review.project_id}/video-reviews?review=${review.id}`
    : `/video-reviews?review=${review.id}`;
}

// List all video reviews for the authenticated user
export const listAllVideoReviews: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const reviews = await prisma.videoReview.findMany({
        where: { userId: BigInt(userId) }, include: { file: true }, orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: reviews.map(serializeReview) });
      return;
    }

    const reviews = db
      .prepare(
        `SELECT vr.*, f.original_name, f.path as file_path
         FROM video_reviews vr
         LEFT JOIN files f ON vr.file_id = f.id
         WHERE vr.user_id = ?
         ORDER BY vr.created_at DESC`,
      )
      .all(userId) as any[];

    const mapped = reviews.map((r: any) => ({
      ...r,
      video_url: r.video_url || undefined,
    }));

    res.json({ success: true, data: mapped });
    return;
  } catch (e) {
    next(e);
  }
};

// List video reviews for a project
export const listVideoReviews: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.projectId);

    if (!projectId) {
      throw new AppError("Project ID is required", 400);
    }
    if (shouldUsePrisma) {
      const project = await prisma.project.findFirst({ where: { id: BigInt(projectId), userId: BigInt(userId) }, select: { id: true } });
      if (!project) throw new AppError("Project not found", 404);
      const reviews = await prisma.videoReview.findMany({
        where: { projectId: project.id }, include: { file: true }, orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: reviews.map(serializeReview) });
      return;
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const reviews = db
      .prepare(
        `SELECT vr.*, f.original_name, f.path as file_path
         FROM video_reviews vr
         LEFT JOIN files f ON vr.file_id = f.id
         WHERE vr.project_id = ?
         ORDER BY vr.created_at DESC`,
      )
      .all(projectId) as any[];

    const mapped = reviews.map((r: any) => ({
      ...r,
      video_url: r.video_url || undefined,
    }));

    res.json({ success: true, data: mapped });
  } catch (e) {
    next(e);
  }
};

// Get a specific video review with comments
export const getVideoReview: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.id);

    if (!reviewId) {
      throw new AppError("Review ID is required", 400);
    }
    if (shouldUsePrisma) {
      const review = await prisma.videoReview.findFirst({
        where: { id: BigInt(reviewId), project: { userId: BigInt(userId) } },
        include: { file: true, comments: { orderBy: { timestampSeconds: "asc" } } },
      });
      if (!review) throw new AppError("Review not found or access denied", 404);
      res.json({ success: true, data: serializeReview(review) });
      return;
    }

    const review = db
      .prepare(
        `SELECT vr.*, f.original_name, f.path as file_path
         FROM video_reviews vr
         LEFT JOIN files f ON vr.file_id = f.id
         WHERE vr.id = ?`,
      )
      .get(reviewId) as any;

    if (!review) {
      throw new AppError("Review not found", 404);
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(review.project_id, userId);

    if (!project) {
      throw new AppError("You don't have permission to access this review", 403);
    }

    // Get comments for this review
    const comments = (db
      .prepare(
        `SELECT * FROM video_comments 
         WHERE review_id = ? 
         ORDER BY timestamp_seconds ASC`,
      )
      .all(reviewId) as any[]).map((c) => ({
      ...c,
      annotations: c.annotations ? JSON.parse(c.annotations) : [],
    }));

    review.video_url = review.video_url || undefined;
    res.json({ success: true, data: { ...review, comments } });
  } catch (e) {
    next(e);
  }
};

// Create a new video review
export const createVideoReview: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    let { projectId, fileId, title, description, status, videoUrl } = req.body;

    if (!title) {
      throw new AppError("Title is required", 400);
    }

    if (!fileId && !videoUrl) {
      throw new AppError("File ID or Video URL is required", 400);
    }
    if (shouldUsePrisma) {
      const owner = BigInt(userId);
      let project;
      if (projectId) {
        project = await prisma.project.findFirst({ where: { id: BigInt(Number(projectId)), userId: owner }, select: { id: true } });
      } else {
        project = await prisma.project.create({ data: {
          userId: owner, name: "Aprovação de Vídeo", description: "Projeto para aprovação de vídeos",
        }, select: { id: true } });
        projectId = Number(project.id);
      }
      if (!project) throw new AppError("Project not found", 404);
      const linkedFileId = fileId ? BigInt(Number(fileId)) : null;
      if (linkedFileId) {
        const file = await prisma.file.findFirst({ where: { id: linkedFileId, projectId: project.id }, select: { id: true } });
        if (!file) throw new AppError("File not found in this project", 404);
      }
      const expiresInDays = 7;
      const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      const shareToken = randomBytes(32).toString("hex");
      const created = await prisma.videoReview.create({
        data: {
          projectId: project.id, fileId: linkedFileId, userId: owner, title,
          description: description || null, status: status || "draft", videoUrl: videoUrl || null,
          shareToken, expiresAt,
        }, include: { file: true },
      });
      res.json({ success: true, data: {
        ...serializeReview(created), shareUrl: `${getClientOrigin()}/review/${shareToken}`,
      } });
      return;
    }

    // If no projectId, auto-create a sandbox project for reviews
    if (!projectId) {
      const result = db
        .prepare(
          "INSERT INTO projects (user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
        )
        .run(userId, "Aprovação de Vídeo", "Projeto para aprovação de vídeos");
      projectId = result.lastInsertRowid as number;
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    // Verify file belongs to project (only if fileId provided)
    if (fileId) {
      const file = db
        .prepare("SELECT * FROM files WHERE id = ? AND project_id = ?")
        .get(fileId, projectId);

      if (!file) {
        throw new AppError("File not found in this project", 404);
      }
    }

    const result = db
      .prepare(
        `INSERT INTO video_reviews (project_id, file_id, user_id, title, description, status, video_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .run(projectId, fileId || null, userId, title, description || null, status || "draft", videoUrl || null);

    const newReview = db
      .prepare(
        `SELECT vr.*, f.original_name, f.path as file_path
         FROM video_reviews vr
         LEFT JOIN files f ON vr.file_id = f.id
         WHERE vr.id = ?`,
      )
      .get(result.lastInsertRowid) as any;

    if (newReview) {
      newReview.video_url = newReview.video_url || undefined;
      const shareData = createShareData(newReview, 7);
      db.prepare(
        `UPDATE video_reviews
         SET share_token = ?, expires_at = ?, updated_at = datetime('now')
         WHERE id = ?`,
      ).run(shareData.shareToken, shareData.expiresAt, newReview.id);
      newReview.share_token = shareData.shareToken;
      newReview.expires_at = shareData.expiresAt;
      newReview.shareUrl = shareData.shareUrl;
    }

    res.json({ success: true, data: newReview });
  } catch (e) {
    next(e);
  }
};

// Update a video review
export const updateVideoReview: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.id);
    const { title, description, status, videoUrl } = req.body;

    if (!reviewId) {
      throw new AppError("Review ID is required", 400);
    }
    if (shouldUsePrisma) {
      const review = await prisma.videoReview.findFirst({
        where: { id: BigInt(reviewId), project: { userId: BigInt(userId) } },
      });
      if (!review) throw new AppError("Review not found or access denied", 404);
      const updated = await prisma.videoReview.update({
        where: { id: review.id }, data: {
          title: title || review.title, description: description || review.description,
          status: status || review.status, videoUrl: videoUrl !== undefined ? videoUrl : review.videoUrl,
          updatedAt: new Date(),
        }, include: { file: true },
      });
      res.json({ success: true, data: serializeReview(updated) });
      return;
    }

    const review = db
      .prepare("SELECT * FROM video_reviews WHERE id = ?")
      .get(reviewId) as any;

    if (!review) {
      throw new AppError("Review not found", 404);
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(review.project_id, userId);

    if (!project) {
      throw new AppError("You don't have permission to update this review", 403);
    }

    db
      .prepare(
        `UPDATE video_reviews 
         SET title = ?, description = ?, status = ?, video_url = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(
        title || review.title,
        description || review.description,
        status || review.status,
        videoUrl !== undefined ? videoUrl : review.video_url,
        reviewId,
      );

    const updatedReview = db
      .prepare(
        `SELECT vr.*, f.original_name, f.path as file_path
         FROM video_reviews vr
         LEFT JOIN files f ON vr.file_id = f.id
         WHERE vr.id = ?`,
      )
      .get(reviewId);

    res.json({ success: true, data: updatedReview });
  } catch (e) {
    next(e);
  }
};

// Delete a video review
export const deleteVideoReview: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.id);

    if (!reviewId) {
      throw new AppError("Review ID is required", 400);
    }
    if (shouldUsePrisma) {
      const result = await prisma.videoReview.deleteMany({
        where: { id: BigInt(reviewId), project: { userId: BigInt(userId) } },
      });
      if (result.count === 0) throw new AppError("Review not found or access denied", 404);
      res.json({ success: true, message: "Review deleted successfully" });
      return;
    }

    const review = db
      .prepare("SELECT * FROM video_reviews WHERE id = ?")
      .get(reviewId) as any;

    if (!review) {
      throw new AppError("Review not found", 404);
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(review.project_id, userId);

    if (!project) {
      throw new AppError("You don't have permission to delete this review", 403);
    }

    db.prepare("DELETE FROM video_reviews WHERE id = ?").run(reviewId);

    res.json({ success: true, message: "Review deleted successfully" });
  } catch (e) {
    next(e);
  }
};

// Generate a shareable link for a review
export const generateShareLink: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.id);
    const { expiresInDays } = req.body;

    if (!reviewId) {
      throw new AppError("Review ID is required", 400);
    }
    if (shouldUsePrisma) {
      const review = await prisma.videoReview.findFirst({
        where: { id: BigInt(reviewId), project: { userId: BigInt(userId) } },
      });
      if (!review) throw new AppError("Review not found or access denied", 404);
      const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + (Number(expiresInDays) || 7));
      const shareToken = randomBytes(32).toString("hex");
      await prisma.videoReview.update({ where: { id: review.id }, data: { shareToken, expiresAt, updatedAt: new Date() } });
      res.json({ success: true, data: {
        shareUrl: `${getClientOrigin()}/review/${shareToken}`, expiresAt: expiresAt.toISOString(),
      } });
      return;
    }

    const review = db
      .prepare("SELECT * FROM video_reviews WHERE id = ?")
      .get(reviewId) as any;

    if (!review) {
      throw new AppError("Review not found", 404);
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(review.project_id, userId);

    if (!project) {
      throw new AppError("You don't have permission to share this review", 403);
    }

    const shareData = createShareData(review, expiresInDays || 7);

    db
      .prepare(
        `UPDATE video_reviews 
         SET share_token = ?, expires_at = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(shareData.shareToken, shareData.expiresAt, reviewId);

    res.json({ success: true, data: { shareUrl: shareData.shareUrl, expiresAt: shareData.expiresAt } });
  } catch (e) {
    next(e);
  }
};

// Access a shared review (public endpoint)
export const accessSharedReview: RequestHandler = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new AppError("Share token is required", 400);
    }

    if (shouldUsePrisma) {
      const review = await prisma.videoReview.findUnique({
        where: { shareToken: token },
        include: { file: true, project: { select: { name: true } }, comments: { orderBy: [{ timestampSeconds: "asc" }, { createdAt: "asc" }] } },
      });
      if (!review) {
        const stateless = parseStatelessReviewToken(token);
        if (!stateless) throw new AppError("Review not found or link expired", 404);
        if (new Date(stateless.expiresAt) < new Date()) throw new AppError("Share link has expired", 410);
        res.json({ success: true, data: {
          id: stateless.id, project_id: 0, file_id: null, title: stateless.title,
          description: stateless.description, status: "pending_review", share_token: token,
          expires_at: stateless.expiresAt, original_name: "Vídeo externo", file_path: null,
          project_name: stateless.projectName, video_url: stateless.videoUrl, comments: [],
        } });
        return;
      }
      if (review.expiresAt && review.expiresAt < new Date()) throw new AppError("Share link has expired", 410);
      const data = serializeReview(review) as any;
      data.video_url = data.video_url || (review.fileId ? `/api/public-review-video?token=${token}` : undefined);
      res.json({ success: true, data });
      return;
    }

    const review = db
      .prepare(
        `SELECT vr.*, f.original_name, f.path as file_path, p.name as project_name
         FROM video_reviews vr
         LEFT JOIN files f ON vr.file_id = f.id
         LEFT JOIN projects p ON vr.project_id = p.id
         WHERE vr.share_token = ?`,
      )
      .get(token) as any;

    if (!review) {
      const stateless = parseStatelessReviewToken(token);
      if (!stateless) {
        throw new AppError("Review not found or link expired", 404);
      }
      if (new Date(stateless.expiresAt) < new Date()) {
        throw new AppError("Share link has expired", 410);
      }
      res.json({
        success: true,
        data: {
          id: stateless.id,
          project_id: 0,
          file_id: null,
          title: stateless.title,
          description: stateless.description,
          status: "pending_review",
          share_token: token,
          expires_at: stateless.expiresAt,
          original_name: "Vídeo externo",
          file_path: null,
          project_name: stateless.projectName,
          video_url: stateless.videoUrl,
          comments: [],
        },
      });
      return;
    }

    // Check if link has expired
    if (review.expires_at && new Date(review.expires_at) < new Date()) {
      throw new AppError("Share link has expired", 410);
    }

    // Get comments for this review
    const comments = (db
      .prepare(
        `SELECT * FROM video_comments 
         WHERE review_id = ? 
         ORDER BY timestamp_seconds ASC`,
      )
      .all(review.id) as any[]).map((c) => ({
      ...c,
      annotations: c.annotations ? JSON.parse(c.annotations) : [],
    }));

    review.video_url = review.video_url || (review.file_id ? `/api/public-review-video?token=${token}` : undefined);
    res.json({ success: true, data: { ...review, comments } });
  } catch (e) {
    next(e);
  }
};

// Stream a review video through the public token, without exposing all files publicly.
export const streamSharedReviewVideo: RequestHandler = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new AppError("Share token is required", 400);
    }
    if (shouldUsePrisma) {
      const review = await prisma.videoReview.findUnique({ where: { shareToken: token }, include: { file: true } });
      if (!review?.file) throw new AppError("Video not found", 404);
      if (review.expiresAt && review.expiresAt < new Date()) throw new AppError("Share link has expired", 410);
      if (review.file.mimeType === "text/uri-list") {
        res.redirect(review.file.path);
        return;
      }
      res.redirect(await createProjectFileUrl(review.file.path, 300));
      return;
    }

    const review = db
      .prepare(
        `SELECT vr.*, f.path as file_path, f.original_name, f.mime_type
         FROM video_reviews vr
         LEFT JOIN files f ON vr.file_id = f.id
         WHERE vr.share_token = ?`,
      )
      .get(token) as any;

    if (!review || !review.file_path) {
      throw new AppError("Video not found", 404);
    }

    if (review.expires_at && new Date(review.expires_at) < new Date()) {
      throw new AppError("Share link has expired", 410);
    }

    const storedPath = safeStoredFilePath(review.file_path);
    if (!fs.existsSync(storedPath)) {
      throw new AppError("Video file not found on disk", 404);
    }

    res.setHeader("Content-Type", review.mime_type || "video/mp4");
    res.setHeader("Content-Disposition", `inline; filename="${review.original_name || "review-video"}"`);
    res.sendFile(storedPath);
  } catch (e) {
    next(e);
  }
};

// Add a comment to a review
export const addComment: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.id);
    const { timestampSeconds, comment, authorName, annotations } = req.body;

    if (!reviewId || timestampSeconds === undefined || !comment) {
      throw new AppError("Review ID, timestamp, and comment are required", 400);
    }
    if (shouldUsePrisma) {
      const review = await prisma.videoReview.findFirst({
        where: { id: BigInt(reviewId), project: { userId: BigInt(userId) } },
      });
      if (!review) throw new AppError("Review not found or access denied", 404);
      const created = await prisma.videoComment.create({ data: {
        reviewId: review.id, userId: BigInt(userId), authorName: authorName || "Anonymous",
        timestampSeconds: Number(timestampSeconds), comment, annotations: annotations || [],
      } });
      notifyUser(Number(review.userId), "Novo comentário no review",
        `${authorName || "Cliente"} comentou em ${Math.floor(Number(timestampSeconds) / 60)}:${String(Math.floor(Number(timestampSeconds) % 60)).padStart(2, "0")}.`,
        "client", reviewLink({ project_id: Number(review.projectId), id: Number(review.id) }));
      res.json({ success: true, data: serializeComment(created) });
      return;
    }

    const review = db
      .prepare("SELECT * FROM video_reviews WHERE id = ?")
      .get(reviewId) as any;

    if (!review) {
      throw new AppError("Review not found", 404);
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(review.project_id, userId);

    if (!project) {
      throw new AppError("You don't have permission to comment on this review", 403);
    }

    const annsJson = annotations ? JSON.stringify(annotations) : "[]";

    const result = db
      .prepare(
        `INSERT INTO video_comments (review_id, user_id, author_name, timestamp_seconds, comment, annotations, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .run(reviewId, userId, authorName || "Anonymous", timestampSeconds, comment, annsJson);

    const newComment = db.prepare("SELECT * FROM video_comments WHERE id = ?").get(result.lastInsertRowid);

    notifyUser(
      review.user_id,
      "Novo comentário no review",
      `${authorName || "Cliente"} comentou em ${Math.floor(Number(timestampSeconds) / 60)}:${String(Math.floor(Number(timestampSeconds) % 60)).padStart(2, "0")}.`,
      "client",
      reviewLink(review),
    );

    res.json({ success: true, data: newComment });
  } catch (e) {
    next(e);
  }
};

// Add a comment to a shared review (public endpoint)
export const addSharedComment: RequestHandler = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { timestampSeconds, comment, authorName, annotations } = req.body;

    if (!token || timestampSeconds === undefined || !comment) {
      throw new AppError("Token, timestamp, and comment are required", 400);
    }
    if (shouldUsePrisma) {
      const review = await prisma.videoReview.findUnique({ where: { shareToken: token } });
      if (!review) {
        const stateless = parseStatelessReviewToken(token);
        if (!stateless) throw new AppError("Review not found", 404);
        if (new Date(stateless.expiresAt) < new Date()) throw new AppError("Share link has expired", 410);
        throw new AppError("Este link esta em armazenamento temporario e nao pode salvar comentarios. Gere um novo link no Studio.", 503);
      }
      if (review.expiresAt && review.expiresAt < new Date()) throw new AppError("Share link has expired", 410);
      const created = await prisma.videoComment.create({ data: {
        reviewId: review.id, userId: review.userId, authorName: authorName || "Anonymous",
        timestampSeconds: Number(timestampSeconds), comment, annotations: annotations || [],
      } });
      notifyUser(Number(review.userId), "Novo comentário do cliente",
        `${authorName || "Cliente"} comentou em ${Math.floor(Number(timestampSeconds) / 60)}:${String(Math.floor(Number(timestampSeconds) % 60)).padStart(2, "0")} no review "${review.title}".`,
        "client", reviewLink({ project_id: Number(review.projectId), id: Number(review.id) }));
      res.json({ success: true, data: serializeComment(created) });
      return;
    }

    const review = db
      .prepare("SELECT * FROM video_reviews WHERE share_token = ?")
      .get(token) as any;

    if (!review) {
      const stateless = parseStatelessReviewToken(token);
      if (!stateless) {
        throw new AppError("Review not found", 404);
      }
      if (new Date(stateless.expiresAt) < new Date()) {
        throw new AppError("Share link has expired", 410);
      }
      throw new AppError(
        "Este link esta em armazenamento temporario e nao pode salvar comentarios. Gere um novo link no Studio.",
        503,
      );
    }

    // Check if link has expired
    if (review.expires_at && new Date(review.expires_at) < new Date()) {
      throw new AppError("Share link has expired", 410);
    }

    const annsJson = annotations ? JSON.stringify(annotations) : "[]";

    const result = db
      .prepare(
        `INSERT INTO video_comments (review_id, user_id, author_name, timestamp_seconds, comment, annotations, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .run(review.id, review.user_id, authorName || "Anonymous", timestampSeconds, comment, annsJson);

    const newComment = db.prepare("SELECT * FROM video_comments WHERE id = ?").get(result.lastInsertRowid) as any;

    notifyUser(
      review.user_id,
      "Novo comentário do cliente",
      `${authorName || "Cliente"} comentou em ${Math.floor(Number(timestampSeconds) / 60)}:${String(Math.floor(Number(timestampSeconds) % 60)).padStart(2, "0")} no review "${review.title}".`,
      "client",
      reviewLink(review),
    );

    res.json({
      success: true,
      data: {
        ...newComment,
        annotations: newComment.annotations ? JSON.parse(newComment.annotations) : [],
      },
    });
  } catch (e) {
    next(e);
  }
};

// Let clients approve or request changes from the public share page.
export const updateSharedReviewStatus: RequestHandler = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { status, authorName, comment } = req.body as {
      status?: string;
      authorName?: string;
      comment?: string;
    };

    const allowed = new Set(["approved", "changes_requested", "rejected"]);
    if (!token || !status || !allowed.has(status)) {
      throw new AppError("Token and a valid status are required", 400);
    }
    if (shouldUsePrisma) {
      const review = await prisma.videoReview.findUnique({ where: { shareToken: token } });
      if (!review) {
        const stateless = parseStatelessReviewToken(token);
        if (!stateless) throw new AppError("Review not found", 404);
        if (new Date(stateless.expiresAt) < new Date()) throw new AppError("Share link has expired", 410);
        throw new AppError("Este link esta em armazenamento temporario e nao pode registrar a decisao. Gere um novo link no Studio.", 503);
      }
      if (review.expiresAt && review.expiresAt < new Date()) throw new AppError("Share link has expired", 410);
      const statusLabel = status === "approved" ? "Aprovado" : status === "changes_requested" ? "Alterações solicitadas" : "Rejeitado";
      const decisionComment = comment?.trim() || statusLabel;
      await prisma.$transaction([
        prisma.videoReview.update({ where: { id: review.id }, data: { status, updatedAt: new Date() } }),
        prisma.videoComment.create({ data: {
          reviewId: review.id, userId: review.userId, authorName: authorName?.trim() || "Cliente",
          timestampSeconds: 0, comment: `[${statusLabel}] ${decisionComment}`, annotations: [],
        } }),
      ]);
      notifyUser(Number(review.userId), `Review ${statusLabel.toLowerCase()}`,
        `${authorName?.trim() || "Cliente"} atualizou o status de "${review.title}".`,
        status === "approved" ? "success" : status === "changes_requested" ? "warning" : "error",
        reviewLink({ project_id: Number(review.projectId), id: Number(review.id) }));
      const updated = await prisma.videoReview.findUnique({
        where: { id: review.id }, include: { file: true, project: { select: { name: true } }, comments: { orderBy: [{ timestampSeconds: "asc" }, { createdAt: "asc" }] } },
      });
      const data = serializeReview(updated) as any;
      data.video_url = data.video_url || (updated?.fileId ? `/api/public-review-video?token=${token}` : undefined);
      res.json({ success: true, data });
      return;
    }

    const review = db
      .prepare("SELECT * FROM video_reviews WHERE share_token = ?")
      .get(token) as any;

    if (!review) {
      const stateless = parseStatelessReviewToken(token);
      if (!stateless) {
        throw new AppError("Review not found", 404);
      }
      if (new Date(stateless.expiresAt) < new Date()) {
        throw new AppError("Share link has expired", 410);
      }
      throw new AppError(
        "Este link esta em armazenamento temporario e nao pode registrar a decisao. Gere um novo link no Studio.",
        503,
      );
    }

    if (review.expires_at && new Date(review.expires_at) < new Date()) {
      throw new AppError("Share link has expired", 410);
    }

    db.prepare(
      `UPDATE video_reviews
       SET status = ?, updated_at = datetime('now')
       WHERE id = ?`,
    ).run(status, review.id);

    const statusLabel =
      status === "approved"
        ? "Aprovado"
        : status === "changes_requested"
          ? "Alterações solicitadas"
          : "Rejeitado";
    const decisionComment = comment?.trim() || statusLabel;
    db.prepare(
      `INSERT INTO video_comments (review_id, user_id, author_name, timestamp_seconds, comment, annotations, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, '[]', datetime('now'), datetime('now'))`,
    ).run(review.id, review.user_id, authorName?.trim() || "Cliente", `[${statusLabel}] ${decisionComment}`);

    notifyUser(
      review.user_id,
      `Review ${statusLabel.toLowerCase()}`,
      `${authorName?.trim() || "Cliente"} atualizou o status de "${review.title}".`,
      status === "approved" ? "success" : status === "changes_requested" ? "warning" : "error",
      reviewLink(review),
    );

    const updatedReview = db
      .prepare(
        `SELECT vr.*, f.original_name, f.path as file_path, p.name as project_name
         FROM video_reviews vr
         LEFT JOIN files f ON vr.file_id = f.id
         LEFT JOIN projects p ON vr.project_id = p.id
         WHERE vr.id = ?`,
      )
      .get(review.id) as any;

    const comments = (db
      .prepare(
        `SELECT * FROM video_comments
         WHERE review_id = ?
         ORDER BY timestamp_seconds ASC, created_at ASC`,
      )
      .all(review.id) as any[]).map((c) => ({
      ...c,
      annotations: c.annotations ? JSON.parse(c.annotations) : [],
    }));

    updatedReview.video_url =
      updatedReview.video_url || (updatedReview.file_id ? `/api/public-review-video?token=${token}` : undefined);
    res.json({ success: true, data: { ...updatedReview, comments } });
  } catch (e) {
    next(e);
  }
};

// Resolve/unresolve a comment
export const resolveComment: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const commentId = parseInt(req.params.id);
    const { resolved } = req.body;

    if (!commentId) {
      throw new AppError("Comment ID is required", 400);
    }
    if (shouldUsePrisma) {
      const commentRecord = await prisma.videoComment.findFirst({
        where: { id: BigInt(commentId), review: { project: { userId: BigInt(userId) } } },
      });
      if (!commentRecord) throw new AppError("Comment not found or access denied", 404);
      const updated = await prisma.videoComment.update({
        where: { id: commentRecord.id }, data: { resolved: Boolean(resolved), updatedAt: new Date() },
      });
      res.json({ success: true, data: serializeComment(updated) });
      return;
    }

    const comment = db
      .prepare(
        `SELECT vc.*, vr.project_id 
         FROM video_comments vc
         LEFT JOIN video_reviews vr ON vc.review_id = vr.id
         WHERE vc.id = ?`,
      )
      .get(commentId) as any;

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(comment.project_id, userId);

    if (!project) {
      throw new AppError("You don't have permission to resolve this comment", 403);
    }

    db
      .prepare(
        `UPDATE video_comments 
         SET resolved = ?, updated_at = datetime('now')
         WHERE id = ?`,
      )
      .run(resolved ? 1 : 0, commentId);

    const updatedComment = db.prepare("SELECT * FROM video_comments WHERE id = ?").get(commentId);

    res.json({ success: true, data: updatedComment });
  } catch (e) {
    next(e);
  }
};

// Delete a comment
export const deleteComment: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const commentId = parseInt(req.params.id);

    if (!commentId) {
      throw new AppError("Comment ID is required", 400);
    }
    if (shouldUsePrisma) {
      const result = await prisma.videoComment.deleteMany({
        where: { id: BigInt(commentId), review: { project: { userId: BigInt(userId) } } },
      });
      if (result.count === 0) throw new AppError("Comment not found or access denied", 404);
      res.json({ success: true, message: "Comment deleted successfully" });
      return;
    }

    const comment = db
      .prepare(
        `SELECT vc.*, vr.project_id 
         FROM video_comments vc
         LEFT JOIN video_reviews vr ON vc.review_id = vr.id
         WHERE vc.id = ?`,
      )
      .get(commentId) as any;

    if (!comment) {
      throw new AppError("Comment not found", 404);
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(comment.project_id, userId);

    if (!project) {
      throw new AppError("You don't have permission to delete this comment", 403);
    }

    db.prepare("DELETE FROM video_comments WHERE id = ?").run(commentId);

    res.json({ success: true, message: "Comment deleted successfully" });
  } catch (e) {
    next(e);
  }
};
