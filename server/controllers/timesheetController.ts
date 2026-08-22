import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as timesheetService from "../services/timesheetService.js";

function parseId(value: string | undefined, label = "ID"): number {
  const id = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(id)) throw new AppError(`${label} inválido`, 400);
  return id;
}

function parseFilters(query: { projectId?: string; from?: string; to?: string }) {
  return {
    projectId: query.projectId ? Number.parseInt(query.projectId, 10) : undefined,
    from: query.from,
    to: query.to,
  };
}

export const listEntries: RequestHandler = async (req, res, next) => {
  try {
    const { projectId, from, to } = req.query as { projectId?: string; from?: string; to?: string };
    const result = await timesheetService.listEntries(req.user!.id, parseFilters({ projectId, from, to }));
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

export const exportEntriesCsv: RequestHandler = async (req, res, next) => {
  try {
    const { projectId, from, to } = req.query as { projectId?: string; from?: string; to?: string };
    const csv = await timesheetService.exportCSV(req.user!.id, parseFilters({ projectId, from, to }));
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="timesheet.csv"');
    res.send(csv);
  } catch (e) {
    next(e);
  }
};

export const getRunningTimer: RequestHandler = async (req, res, next) => {
  try {
    const running = await timesheetService.getRunningTimer(req.user!.id);
    res.json({ success: true, data: running });
  } catch (e) {
    next(e);
  }
};

export const startTimer: RequestHandler = async (req, res, next) => {
  try {
    const { projectId, description } = (req.body ?? {}) as { projectId?: number | null; description?: string };
    const entry = await timesheetService.startTimer(req.user!.id, { projectId: projectId ?? null, description });
    res.status(201).json({ success: true, data: entry });
  } catch (e) {
    next(e);
  }
};

export const stopTimer: RequestHandler = async (req, res, next) => {
  try {
    const entryId = parseId(req.params.id);
    const { hourlyRate } = (req.body ?? {}) as { hourlyRate?: number | null };
    const entry = await timesheetService.stopTimer(req.user!.id, entryId, hourlyRate);
    res.json({ success: true, data: entry });
  } catch (e) {
    next(e);
  }
};

export const addManualEntry: RequestHandler = async (req, res, next) => {
  try {
    const { projectId, description, startedAt, endedAt, hourlyRate } = (req.body ?? {}) as {
      projectId?: number | null;
      description?: string;
      startedAt?: string;
      endedAt?: string;
      hourlyRate?: number | null;
    };
    if (!startedAt || !endedAt) throw new AppError("Datas de início e fim são obrigatórias", 400);

    const entry = await timesheetService.addManualEntry(req.user!.id, {
      projectId: projectId ?? null,
      description,
      startedAt,
      endedAt,
      hourlyRate: hourlyRate ?? null,
    });
    res.status(201).json({ success: true, data: entry });
  } catch (e) {
    next(e);
  }
};

export const deleteEntry: RequestHandler = async (req, res, next) => {
  try {
    const entryId = parseId(req.params.id);
    const deleted = await timesheetService.deleteEntry(req.user!.id, entryId);
    if (!deleted) throw new AppError("Registro não encontrado", 404);
    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};

export const getReport: RequestHandler = async (req, res, next) => {
  try {
    const report = await timesheetService.getReport(req.user!.id);
    res.json({ success: true, data: report });
  } catch (e) {
    next(e);
  }
};
