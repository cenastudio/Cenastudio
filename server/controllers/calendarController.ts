import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as calendarService from "../services/calendarService.js";

function appRedirectUrl(path: string, params: Record<string, string>) {
  const base =
    process.env.PUBLIC_APP_URL ||
    process.env.FRONTEND_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:5173");
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

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

export const getGoogleStatus: RequestHandler = async (req, res, next) => {
  try {
    const connection = await calendarService.getGoogleCalendarConnection(req.user!.id);
    res.json({ success: true, data: connection });
  } catch (e) {
    next(e);
  }
};

export const createGoogleAuthUrl: RequestHandler = async (req, res, next) => {
  try {
    const url = calendarService.getGoogleAuthUrl(req.user!.id);
    res.json({ success: true, data: { url } });
  } catch (e) {
    next(e);
  }
};

export const handleGoogleCallback: RequestHandler = async (req, res, next) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    if (!code || !state) throw new AppError("Callback OAuth inválido", 400);

    await calendarService.handleGoogleCallback(code, state);
    res.redirect(appRedirectUrl("/settings", { calendar: "connected" }));
  } catch (e) {
    if (e instanceof AppError) {
      res.redirect(appRedirectUrl("/settings", { calendar: "error", message: e.message }));
      return;
    }
    next(e);
  }
};

export const syncProjectSchedule: RequestHandler = async (req, res, next) => {
  try {
    const projectId = Number.parseInt(req.params.projectId, 10);
    if (!Number.isFinite(projectId)) throw new AppError("ID de projeto inválido", 400);

    const result = await calendarService.syncProjectScheduleToGoogle(req.user!.id, projectId);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

export const revokeGoogleCalendar: RequestHandler = async (req, res, next) => {
  try {
    await calendarService.revokeGoogleCalendar(req.user!.id);
    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};
