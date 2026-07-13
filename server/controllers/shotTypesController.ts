import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as shotTypesService from "../services/shotTypesService.js";

function parseId(value: string | undefined, label = "ID"): number {
  const id = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(id)) throw new AppError(`${label} inválido`, 400);
  return id;
}

export const listShotTypes: RequestHandler = async (req, res, next) => {
  try {
    const types = await shotTypesService.listShotTypes(req.user!.id);
    res.json({ success: true, data: types });
  } catch (e) {
    next(e);
  }
};

export const createShotType: RequestHandler = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new AppError("Nome do tipo de shot é obrigatório", 400);
    }

    const type = await shotTypesService.createShotType(req.user!.id, name.trim());
    res.status(201).json({ success: true, data: type });
  } catch (e) {
    next(e);
  }
};

export const deleteShotType: RequestHandler = async (req, res, next) => {
  try {
    const typeId = parseId(req.params.id);
    await shotTypesService.deleteShotType(req.user!.id, typeId);
    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};
