import { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { db } from "../models/db.js";
import {
  uploadProjectFile,
  storageObjectPath,
} from "../services/supabaseStorage.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

const MAX_VIDEO_SIZE_MB = Number.parseInt(process.env.MAX_VIDEO_SIZE_MB || "2000", 10);
const MAX_VIDEO_SIZE = MAX_VIDEO_SIZE_MB * 1024 * 1024;

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
  "video/x-matroska", // .mkv
  "video/webm",
];

function serializeFile(value: any) {
  return withSnakeCase(value, {
    projectId: "project_id",
    userId: "user_id",
    originalName: "original_name",
    mimeType: "mime_type",
    createdAt: "created_at",
  });
}

/**
 * Upload video file to Supabase Storage
 *
 * Expects multipart/form-data with:
 * - file: video file
 * - projectId: project ID (optional)
 * - metadata: JSON string with { filename, duration?, width?, height?, thumbnail? }
 */
export const uploadVideo: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.body.projectId ? parseInt(req.body.projectId) : null;

    // Parse metadata
    const metadataStr = req.body.metadata;
    if (!metadataStr) {
      throw new AppError("Metadata is required", 400);
    }

    let metadata: {
      filename: string;
      duration?: number;
      width?: number;
      height?: number;
      thumbnail?: string;
    };

    try {
      metadata = JSON.parse(metadataStr);
    } catch {
      throw new AppError("Invalid metadata format", 400);
    }

    // Get file data from multipart
    const fileData = req.body.fileData; // Base64 from client
    if (!fileData) {
      throw new AppError("File data is required", 400);
    }

    // Decode file
    const buffer = Buffer.from(fileData, "base64");
    const fileSize = buffer.length;

    // Validate size
    if (fileSize > MAX_VIDEO_SIZE) {
      throw new AppError(
        `Vídeo excede o limite de ${MAX_VIDEO_SIZE_MB}MB`,
        413
      );
    }

    // Detect MIME type from filename or default to mp4
    const ext = metadata.filename.split(".").pop()?.toLowerCase();
    let mimeType = "video/mp4";

    if (ext === "mov" || ext === "qt") mimeType = "video/quicktime";
    else if (ext === "avi") mimeType = "video/x-msvideo";
    else if (ext === "mkv") mimeType = "video/x-matroska";
    else if (ext === "webm") mimeType = "video/webm";

    // Validate video type
    if (!ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      throw new AppError(
        `Formato não suportado. Aceitos: MP4, MOV, AVI, MKV, WebM`,
        400
      );
    }

    if (shouldUsePrisma) {
      // Verify project ownership if projectId provided
      if (projectId) {
        const project = await prisma.project.findFirst({
          where: { id: BigInt(projectId), userId: BigInt(userId) },
          select: { id: true },
        });
        if (!project) {
          throw new AppError("Project not found", 404);
        }
      }

      // Generate storage path
      const storagePath = storageObjectPath(
        userId,
        projectId || 0,
        metadata.filename
      );

      // Upload to Supabase Storage
      await uploadProjectFile(storagePath, buffer, mimeType);

      // Save file metadata to database
      const created = await prisma.file.create({
        data: {
          userId: BigInt(userId),
          projectId: projectId ? BigInt(projectId) : null,
          filename: storagePath.split("/").pop() || metadata.filename,
          originalName: metadata.filename,
          mimeType: mimeType,
          size: fileSize,
          path: storagePath,
          // Store video metadata as JSON if needed in future
        },
      });

      res.json({
        success: true,
        data: {
          ...serializeFile(created),
          metadata: {
            duration: metadata.duration,
            width: metadata.width,
            height: metadata.height,
          },
        },
      });
      return;
    }

    // SQLite fallback
    // Verify project ownership if projectId provided
    if (projectId) {
      const project = db
        .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
        .get(projectId, userId);

      if (!project) {
        throw new AppError("Project not found", 404);
      }
    }

    // Generate storage path
    const storagePath = storageObjectPath(
      userId,
      projectId || 0,
      metadata.filename
    );

    // Upload to Supabase Storage
    await uploadProjectFile(storagePath, buffer, mimeType);

    // Save file metadata to database
    const result = db
      .prepare(
        `INSERT INTO files (user_id, project_id, filename, original_name, mime_type, size, path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      )
      .run(
        userId,
        projectId,
        storagePath.split("/").pop() || metadata.filename,
        metadata.filename,
        mimeType,
        fileSize,
        storagePath
      );

    const newFile = db
      .prepare("SELECT * FROM files WHERE id = ?")
      .get(result.lastInsertRowid) as any;

    res.json({
      success: true,
      data: {
        ...newFile,
        metadata: {
          duration: metadata.duration,
          width: metadata.width,
          height: metadata.height,
        },
      },
    });
  } catch (e) {
    next(e);
  }
};
