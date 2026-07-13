import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as shotListService from "../services/shotListService.js";

function parseId(value: string | undefined, label = "ID"): number {
  const id = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(id)) throw new AppError(`${label} inválido`, 400);
  return id;
}

export const getShotList: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseId(req.params.projectId, "ID de projeto");
    const result = await shotListService.listShots(req.user!.id, projectId);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

export const addShot: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseId(req.params.projectId, "ID de projeto");
    const shot = await shotListService.addShot(req.user!.id, projectId, req.body);
    res.status(201).json({ success: true, data: shot });
  } catch (e) {
    next(e);
  }
};

export const updateShot: RequestHandler = async (req, res, next) => {
  try {
    const shotId = parseId(req.params.id);
    const shot = await shotListService.updateShot(req.user!.id, shotId, req.body);
    res.json({ success: true, data: shot });
  } catch (e) {
    next(e);
  }
};

export const deleteShot: RequestHandler = async (req, res, next) => {
  try {
    const shotId = parseId(req.params.id);
    await shotListService.deleteShot(req.user!.id, shotId);
    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};

export const reorderShots: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseId(req.params.projectId, "ID de projeto");
    const { orderedIds } = req.body as { orderedIds?: number[] };
    if (!Array.isArray(orderedIds)) throw new AppError("orderedIds deve ser uma lista", 400);
    const shots = await shotListService.reorderShots(req.user!.id, projectId, orderedIds);
    res.json({ success: true, data: shots });
  } catch (e) {
    next(e);
  }
};

export const uploadThumbnail: RequestHandler = async (req, res, next) => {
  try {
    const shotId = parseId(req.params.id);
    const { fileData, filename } = req.body;

    if (!fileData) throw new AppError("Dados da imagem são obrigatórios", 400);
    if (!filename) throw new AppError("Nome do arquivo é obrigatório", 400);

    // Decode base64
    const buffer = Buffer.from(fileData, "base64");

    // Detect MIME type from filename
    const ext = filename.split(".").pop()?.toLowerCase();
    let mimeType = "image/jpeg";
    if (ext === "png") mimeType = "image/png";
    else if (ext === "webp") mimeType = "image/webp";
    else if (ext === "gif") mimeType = "image/gif";

    const thumbnailUrl = await shotListService.uploadShotThumbnail(
      req.user!.id,
      shotId,
      buffer,
      mimeType
    );

    res.json({ success: true, data: { thumbnailUrl } });
  } catch (e) {
    next(e);
  }
};

export const duplicateShot: RequestHandler = async (req, res, next) => {
  try {
    const shotId = parseId(req.params.id);
    const shot = await shotListService.duplicateShot(req.user!.id, shotId);
    res.status(201).json({ success: true, data: shot });
  } catch (e) {
    next(e);
  }
};

export const exportPdf: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseId(req.params.projectId, "ID de projeto");
    const pdfBuffer = await shotListService.generateShotListPdf(req.user!.id, projectId);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="shotlist-projeto-${projectId}.pdf"`);
    res.send(pdfBuffer);
  } catch (e) {
    next(e);
  }
};
