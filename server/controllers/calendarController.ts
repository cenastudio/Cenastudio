import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as calendarService from "../services/calendarService.js";

export const exportProjectSchedule: RequestHandler = async (req, res, next) => {
  try {
    const projectId = Number.parseInt(req.params.projectId, 10);
    if (!Number.isFinite(projectId)) throw new AppError("ID de projeto inválido", 400);

    const { filename, content } = await calendarService.buildProjectScheduleIcs(req.user!.id, projectId);

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(content);
  } catch (e) {
    next(e);
  }
};
