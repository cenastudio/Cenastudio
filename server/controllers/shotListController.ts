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
