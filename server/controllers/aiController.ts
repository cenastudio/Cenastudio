import type { RequestHandler } from "express";
import { checkAndIncrementUsage } from "../services/authService.js";
import * as aiService from "../services/aiService.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

export const generate: RequestHandler = async (req, res, next) => {
  try {
    const { toolId, input, projectId } = req.body;
    await checkAndIncrementUsage(req.user!.id, toolId);
    const result = await aiService.generateForTool(req.user!.id, toolId, input, projectId);
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};

export const getHistory: RequestHandler = async (req, res, next) => {
  try {
    const { toolId } = req.params;
    const projectId = req.query.projectId ? Number(req.query.projectId) : null;
    const projectFilter = projectId && Number.isFinite(projectId) ? projectId : null;
    if (shouldUsePrisma) {
      const rows = await prisma.generation.findMany({
        where: {
          userId: BigInt(req.user!.id),
          toolId,
          ...(projectFilter ? { projectId: BigInt(projectFilter) } : {}),
        },
        select: {
          id: true, toolId: true, input: true, output: true, createdAt: true, projectId: true,
          project: { select: { name: true } },
        },
        orderBy: { id: "desc" }, take: 20,
      });
      res.json({ success: true, data: rows.map((row) => ({
        id: Number(row.id), toolId: row.toolId, input: row.input, output: row.output,
        createdAt: row.createdAt.toISOString(),
        projectId: row.projectId ? Number(row.projectId) : null,
        projectName: row.project?.name || null,
      })) });
      return;
    }
    if (projectFilter) {
      const rows = db
        .prepare(
          "SELECT g.id, g.tool_id as toolId, g.input, g.output, g.created_at as createdAt, g.project_id as projectId, p.name as projectName FROM generations g LEFT JOIN projects p ON p.id = g.project_id WHERE g.user_id = ? AND g.tool_id = ? AND g.project_id = ? ORDER BY g.id DESC LIMIT 20",
        )
        .all(req.user!.id, toolId, projectFilter);
      res.json({ success: true, data: rows });
      return;
    }
    const rows = db
      .prepare(
        "SELECT g.id, g.tool_id as toolId, g.input, g.output, g.created_at as createdAt, g.project_id as projectId, p.name as projectName FROM generations g LEFT JOIN projects p ON p.id = g.project_id WHERE g.user_id = ? AND g.tool_id = ? ORDER BY g.id DESC LIMIT 20",
      )
      .all(req.user!.id, toolId);
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};
