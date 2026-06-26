import { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import path from "path";
import fs from "fs";

const MAX_UPLOAD_SIZE_MB = Number.parseInt(process.env.MAX_UPLOAD_SIZE_MB || "10", 10);
const MAX_UPLOAD_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024;

// Ensure uploads directory exists
const UPLOADS_DIR =
  process.env.VERCEL === "1" ? path.join("/tmp", "uploads") : path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// List files for a project
export const listFiles: RequestHandler = (req, res, next) => {
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

    const files = db
      .prepare("SELECT * FROM files WHERE project_id = ? ORDER BY created_at DESC")
      .all(projectId);

    res.json({ success: true, data: files });
  } catch (e) {
    next(e);
  }
};

// Upload a file
export const uploadFile: RequestHandler = (req, res, next) => {
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
export const deleteFile: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const fileId = parseInt(req.params.id);

    if (!fileId) {
      throw new AppError("File ID is required", 400);
    }

    // Get file info
    const file = db
      .prepare("SELECT * FROM files WHERE id = ? AND user_id = ?")
      .get(fileId, userId) as any;

    if (!file) {
      throw new AppError("File not found", 404);
    }

    // Delete physical file
    if (file.mime_type !== "text/uri-list" && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // Delete from database
    db.prepare("DELETE FROM files WHERE id = ?").run(fileId);

    res.json({ success: true, message: "File deleted successfully" });
  } catch (e) {
    next(e);
  }
};

// Get file info
export const getFile: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const fileId = parseInt(req.params.id);

    if (!fileId) {
      throw new AppError("File ID is required", 400);
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
export const downloadFile: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const fileId = parseInt(req.params.id);

    if (!fileId) {
      throw new AppError("File ID is required", 400);
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

    if (!fs.existsSync(file.path)) {
      throw new AppError("File not found on disk", 404);
    }

    res.download(file.path, file.original_name);
  } catch (e) {
    next(e);
  }
};
