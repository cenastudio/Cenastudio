import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as shotStoryboardService from "../services/shotStoryboardService.js";

function parseId(value: string | undefined, label = "ID"): number {
  const id = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(id)) throw new AppError(`${label} inválido`, 400);
  return id;
}

export const listFrames: RequestHandler = async (req, res, next) => {
  try {
    const shotId = parseId(req.params.id, "ID do plano");
    const frames = await shotStoryboardService.listFrames(req.user!.id, shotId);
    res.json({ success: true, data: frames });
  } catch (e) {
    next(e);
  }
};

export const generateFrame: RequestHandler = async (req, res, next) => {
  try {
    const shotId = parseId(req.params.id, "ID do plano");
    const { prompt, aspectRatio } = (req.body ?? {}) as {
      prompt?: string;
      aspectRatio?: "16:9" | "4:3" | "1:1";
    };
    if (!prompt || !prompt.trim()) throw new AppError("Prompt é obrigatório", 400);
    if (aspectRatio && !["16:9", "4:3", "1:1"].includes(aspectRatio)) {
      throw new AppError("Aspect ratio inválido", 400);
    }

    const frame = await shotStoryboardService.generateFrame(req.user!.id, shotId, { prompt, aspectRatio });
    res.status(201).json({ success: true, data: frame });
  } catch (e) {
    next(e);
  }
};

export const approveFrame: RequestHandler = async (req, res, next) => {
  try {
    const frameId = parseId(req.params.frameId, "ID do frame");
    const frame = await shotStoryboardService.approveFrame(req.user!.id, frameId);
    res.json({ success: true, data: frame });
  } catch (e) {
    next(e);
  }
};

export const deleteFrame: RequestHandler = async (req, res, next) => {
  try {
    const frameId = parseId(req.params.frameId, "ID do frame");
    await shotStoryboardService.deleteFrame(req.user!.id, frameId);
    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};
