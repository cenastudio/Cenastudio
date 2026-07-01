import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import path from "path";
import fs from "fs";
import { ensureUploadsDirectory, safeStoredFilePath, UPLOADS_DIR } from "../utils/fileSafety.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import {
  createProjectFileUrl,
  removeProjectFile,
  storageObjectPath,
  uploadProjectFile,
} from "../services/supabaseStorage.js";

function serializeFile(value: any) {
  return withSnakeCase(value, {
    projectId: "project_id", userId: "user_id", originalName: "original_name",
    mimeType: "mime_type", createdAt: "created_at",
  });
}

const MAX_UPLOAD_SIZE_MB = Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB || "10", 10);
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

// Ensure uploads directory exists
ensureUploadsDirectory();

// List files for a project
export const listFiles: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.params.projectId);

    if (!projectId) {
      throw new AppError("Project ID is required", 400);
    }
    if (shouldUsePrisma) {
      const project = await prisma.project.findFirst({ where: { id: BigInt(projectId), userId: BigInt(userId) }, select: { id: true } });
      if (!project) throw new AppError("Project not found", 404);
      const files = await prisma.file.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" } });
      res.json({ success: true, data: files.map(serializeFile) });
      return;
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const files = db
      .prepare("SELECT * FROM files WHERE project_id = ? ORDER BY created_at DESC")
      .all(projectId);

    res.json({ success: true, data: files });
  } catch (e) {
    next(e);
  }
};

// Upload a file
export const uploadFile: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = parseInt(req.body.projectId);
    const fileName = req.body.fileName;
    const fileType = req.body.fileType;
    const fileSize = parseInt(req.body.fileSize);
    const fileData = req.body.fileData; // Base64 encoded file data

    if (!projectId || !fileName || !fileData) {
      throw new AppError("Missing required fields", 400);
    }

    const decodedSize = Buffer.byteLength(fileData, "utf8") * 0.75;
    if (decodedSize > MAX_UPLOAD_SIZE) {
      throw new AppError(`Arquivo excede o limite de ${MAX_UPLOAD_SIZE_MB}MB`, 413);
    }

    if (shouldUsePrisma) {
      const project = await prisma.project.findFirst({
        where: { id: BigInt(projectId), userId: BigInt(userId) }, select: { id: true },
      });
      if (!project) throw new AppError("Project not found", 404);
      let storedPath: string;
      let storedSize: number;
      let storedFilename = fileName;
      if (fileType === "text/uri-list") {
        const decodedUrl = Buffer.from(fileData, "base64").toString("utf8").trim();
        if (!/^https?:\/\/\S+$/i.test(decodedUrl)) throw new AppError("URL inválida", 400);
        storedPath = decodedUrl;
        storedSize = decodedUrl.length;
      } else {
        const buffer = Buffer.from(fileData, "base64");
        storedPath = storageObjectPath(userId, projectId, fileName);
        storedFilename = storedPath.split("/").pop() || fileName;
        storedSize = Number.isFinite(fileSize) ? fileSize : buffer.length;
        await uploadProjectFile(storedPath, buffer, fileType);
      }
      const created = await prisma.file.create({ data: {
        userId: BigInt(userId), projectId: project.id, filename: storedFilename,
        originalName: fileName, mimeType: fileType || null, size: storedSize, path: storedPath,
      } });
      res.json({ success: true, data: serializeFile(created) });
      return;
    }

    // Verify user owns the project
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId);

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    if (fileType === "text/uri-list") {
      const decodedUrl = Buffer.from(fileData, "base64").toString("utf8").trim();
      if (!/^https?:\/\/\S+$/i.test(decodedUrl)) {
        throw new AppError("URL inválida", 400);
      }

      const result = db
        .prepare(
          `INSERT INTO files (user_id, project_id, filename, original_name, mime_type, size, path, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        )
        .run(userId, projectId, fileName, fileName, fileType, decodedUrl.length, decodedUrl);

      const newFile = db
        .prepare("SELECT * FROM files WHERE id = ?")
        .get(result.lastInsertRowid);

      res.json({ success: true, data: newFile });
      return;
    }

    // Create project-specific directory
    const projectDir = path.join(UPLOADS_DIR, `project_${projectId}`);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueFileName = `${timestamp}_${safeFileName}`;
    const filePath = path.join(projectDir, uniqueFileName);

    // Decode base64 and save file
    const buffer = Buffer.from(fileData, "base64");
    fs.writeFileSync(filePath, buffer);

    // Save file metadata to database
    const result = db
      .prepare(
        `INSERT INTO files (user_id, project_id, filename, original_name, mime_type, size, path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      )
      .run(userId, projectId, uniqueFileName, fileName, fileType, fileSize, filePath);

    const newFile = db
      .prepare("SELECT * FROM files WHERE id = ?")
      .get(result.lastInsertRowid);

    res.json({ success: true, data: newFile });
  } catch (e) {
    next(e);
  }
};

// Delete a file
export const deleteFile: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const fileId = parseInt(req.params.id);

    if (!fileId) {
      throw new AppError("File ID is required", 400);
    }
    if (shouldUsePrisma) {
      const file = await prisma.file.findFirst({ where: { id: BigInt(fileId), userId: BigInt(userId) } });
      if (!file) throw new AppError("File not found", 404);
      if (file.mimeType !== "text/uri-list") await removeProjectFile(file.path);
      await prisma.file.delete({ where: { id: file.id } });
      res.json({ success: true, message: "File deleted successfully" });
      return;
    }

    // Get file info
    const file = db
      .prepare("SELECT * FROM files WHERE id = ? AND user_id = ?")
      .get(fileId, userId) as any;

    if (!file) {
      throw new AppError("File not found", 404);
    }

    // Delete physical file
    if (file.mime_type !== "text/uri-list") {
      const storedPath = safeStoredFilePath(file.path);
      if (fs.existsSync(storedPath)) fs.unlinkSync(storedPath);
    }

    // Delete from database
    db.prepare("DELETE FROM files WHERE id = ?").run(fileId);

    res.json({ success: true, message: "File deleted successfully" });
  } catch (e) {
    next(e);
  }
};

// Get file info
export const getFile: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const fileId = parseInt(req.params.id);

    if (!fileId) {
      throw new AppError("File ID is required", 400);
    }
    if (shouldUsePrisma) {
      const file = await prisma.file.findFirst({ where: { id: BigInt(fileId), userId: BigInt(userId) } });
      if (!file) throw new AppError("File not found", 404);
      res.json({ success: true, data: serializeFile(file) });
      return;
    }

    const file = db
      .prepare("SELECT * FROM files WHERE id = ? AND user_id = ?")
      .get(fileId, userId) as any;

    if (!file) {
      throw new AppError("File not found", 404);
    }

    res.json({ success: true, data: file });
  } catch (e) {
    next(e);
  }
};

// Download file
export const downloadFile: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const fileId = parseInt(req.params.id);

    if (!fileId) {
      throw new AppError("File ID is required", 400);
    }
    if (shouldUsePrisma) {
      const file = await prisma.file.findFirst({ where: { id: BigInt(fileId), userId: BigInt(userId) } });
      if (!file) throw new AppError("File not found", 404);
      if (file.mimeType === "text/uri-list") {
        res.redirect(file.path);
        return;
      }
      res.redirect(await createProjectFileUrl(file.path));
      return;
    }

    const file = db
      .prepare("SELECT * FROM files WHERE id = ? AND user_id = ?")
      .get(fileId, userId) as any;

    if (!file) {
      throw new AppError("File not found", 404);
    }

    if (file.mime_type === "text/uri-list") {
      res.redirect(file.path);
      return;
    }

    const storedPath = safeStoredFilePath(file.path);
    if (!fs.existsSync(storedPath)) {
      throw new AppError("File not found on disk", 404);
    }

    res.download(storedPath, file.original_name);
  } catch (e) {
    next(e);
  }
};
