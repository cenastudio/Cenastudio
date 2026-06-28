import fs from "fs";
import path from "path";
import { AppError } from "../middleware/errorHandler.js";

export const UPLOADS_DIR =
  process.env.VERCEL === "1" ? path.join("/tmp", "uploads") : path.join(process.cwd(), "uploads");

export function ensureUploadsDirectory() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function safeStoredFilePath(filePath: string) {
  const uploadsRoot = path.resolve(UPLOADS_DIR);
  const resolved = path.resolve(filePath);
  if (resolved !== uploadsRoot && !resolved.startsWith(`${uploadsRoot}${path.sep}`)) {
    throw new AppError("Caminho de arquivo invalido.", 400);
  }
  return resolved;
}
