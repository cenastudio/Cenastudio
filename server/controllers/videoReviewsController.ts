import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import fs from "fs";
import { notifyUser } from "../services/notificationService.js";

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
export const listAllVideoReviews: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;

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
export const listVideoReviews: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.projectId);

    if (!projectId) {
      throw new AppError("Project ID is required", 400);
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
export const getVideoReview: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.id);

    if (!reviewId) {
      throw new AppError("Review ID is required", 400);
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
export const createVideoReview: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    let { projectId, fileId, title, description, status, videoUrl } = req.body;

    if (!title) {
      throw new AppError("Title is required", 400);
    }

    if (!fileId && !videoUrl) {
      throw new AppError("File ID or Video URL is required", 400);
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
export const updateVideoReview: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.id);
    const { title, description, status, videoUrl } = req.body;

    if (!reviewId) {
      throw new AppError("Review ID is required", 400);
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
export const deleteVideoReview: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.id);

    if (!reviewId) {
      throw new AppError("Review ID is required", 400);
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
export const generateShareLink: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.id);
    const { expiresInDays } = req.body;

    if (!reviewId) {
      throw new AppError("Review ID is required", 400);
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
export const accessSharedReview: RequestHandler = (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new AppError("Share token is required", 400);
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
export const streamSharedReviewVideo: RequestHandler = (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      throw new AppError("Share token is required", 400);
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

    if (!fs.existsSync(review.file_path)) {
      throw new AppError("Video file not found on disk", 404);
    }

    res.setHeader("Content-Type", review.mime_type || "video/mp4");
    res.setHeader("Content-Disposition", `inline; filename="${review.original_name || "review-video"}"`);
    res.sendFile(review.file_path);
  } catch (e) {
    next(e);
  }
};

// Add a comment to a review
export const addComment: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const reviewId = parseInt(req.params.id);
    const { timestampSeconds, comment, authorName, annotations } = req.body;

    if (!reviewId || timestampSeconds === undefined || !comment) {
      throw new AppError("Review ID, timestamp, and comment are required", 400);
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
export const addSharedComment: RequestHandler = (req, res, next) => {
  try {
    const { token } = req.params;
    const { timestampSeconds, comment, authorName, annotations } = req.body;

    if (!token || timestampSeconds === undefined || !comment) {
      throw new AppError("Token, timestamp, and comment are required", 400);
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
      res.json({
        success: true,
        data: {
          id: Date.now(),
          review_id: stateless.id,
          user_id: stateless.id,
          author_name: authorName || "Cliente",
          timestamp_seconds: timestampSeconds,
          comment,
          annotations: annotations || [],
          resolved: 0,
          created_at: new Date().toISOString(),
        },
      });
      return;
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
export const updateSharedReviewStatus: RequestHandler = (req, res, next) => {
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
      res.json({
        success: true,
        data: {
          id: stateless.id,
          project_id: 0,
          file_id: null,
          title: stateless.title,
          description: stateless.description,
          status,
          share_token: token,
          expires_at: stateless.expiresAt,
          original_name: "Vídeo externo",
          file_path: null,
          project_name: stateless.projectName,
          video_url: stateless.videoUrl,
          comments: [
            {
              id: Date.now(),
              review_id: stateless.id,
              author_name: authorName?.trim() || "Cliente",
              timestamp_seconds: 0,
              comment: `[${status}] ${comment?.trim() || status}`,
              annotations: [],
              resolved: 0,
              created_at: new Date().toISOString(),
            },
          ],
        },
      });
      return;
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
export const resolveComment: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const commentId = parseInt(req.params.id);
    const { resolved } = req.body;

    if (!commentId) {
      throw new AppError("Comment ID is required", 400);
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
export const deleteComment: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const commentId = parseInt(req.params.id);

    if (!commentId) {
      throw new AppError("Comment ID is required", 400);
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
