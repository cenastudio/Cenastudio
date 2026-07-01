import type { RequestHandler } from "express";
import * as toolService from "../services/toolService.js";

export const listTools: RequestHandler = async (_req, res, next) => {
  try {
    res.json({ success: true, data: await toolService.listActiveTools() });
  } catch (e) {
    next(e);
  }
};

export const getTool: RequestHandler = async (req, res, next) => {
  try {
    res.json({ success: true, data: await toolService.getTool(req.params.id) });
  } catch (e) {
    next(e);
  }
};
