import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as portalDataService from "../services/portalDataService.js";

function parseId(value: string, label: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) throw new AppError(`${label} inválido`, 400);
  return parsed;
}

export const listProjects: RequestHandler = async (req, res, next) => {
  try {
    const data = await portalDataService.listProjectsForClient(req.portalUser!.clientId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

export const getProject: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseId(req.params.id, "ID de projeto");
    const data = await portalDataService.getProjectForClient(req.portalUser!.clientId, projectId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

export const listFiles: RequestHandler = async (req, res, next) => {
  try {
    const data = await portalDataService.listFilesForClient(req.portalUser!.clientId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

export const downloadFile: RequestHandler = async (req, res, next) => {
  try {
    const fileId = parseId(req.params.id, "ID de arquivo");
    const url = await portalDataService.getFileDownloadUrlForClient(req.portalUser!.clientId, fileId);
    res.redirect(url);
  } catch (e) {
    next(e);
  }
};

export const listProposals: RequestHandler = async (req, res, next) => {
  try {
    const data = await portalDataService.listProposalsForClient(req.portalUser!.clientId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

export const listMeetings: RequestHandler = async (req, res, next) => {
  try {
    const data = await portalDataService.listMeetingsForClient(req.portalUser!.clientId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

export const getFinancialSummary: RequestHandler = async (req, res, next) => {
  try {
    const data = await portalDataService.getFinancialSummaryForClient(req.portalUser!.clientId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
