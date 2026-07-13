import type { RequestHandler } from "express";
import * as shotTypeService from "../services/shotTypeService.js";

/**
 * GET /api/shot-types
 * List all shot types for authenticated user (default + custom)
 */
export const listShotTypes: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;

    // Ensure defaults are created on first access
    await shotTypeService.ensureDefaultShotTypes(userId);

    const types = await shotTypeService.listShotTypes(userId);
    return res.json({ success: true, data: types });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/shot-types
 * Create a new custom shot type
 */
export const addShotType: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        success: false,
        error: "Nome do tipo é obrigatório",
      });
    }

    const type = await shotTypeService.addShotType(userId, name);
    return res.json({ success: true, data: type });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Já existe")) {
      return res.status(409).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/shot-types/:id
 * Delete a custom shot type (cannot delete defaults)
 */
export const deleteShotType: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const typeId = Number(req.params.id);

    if (isNaN(typeId)) {
      return res.status(400).json({
        success: false,
        error: "ID inválido",
      });
    }

    await shotTypeService.deleteShotType(userId, typeId);
    return res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    if (error instanceof Error && error.message.includes("não encontrado")) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    if (error instanceof Error && error.message.includes("tipos padrão")) {
      return res.status(403).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};
