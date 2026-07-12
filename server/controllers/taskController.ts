import type { RequestHandler } from "express";
import { AppError } from "../middleware/errorHandler.js";
import * as taskService from "../services/taskService.js";

function parseId(value: string | undefined, label = "ID"): number {
  const id = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(id)) throw new AppError(`${label} inválido`, 400);
  return id;
}

export const listProjectTasks: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseId(req.params.projectId, "ID de projeto");
    const tasks = await taskService.listTasksByProject(req.user!.id, projectId);
    res.json({ success: true, data: tasks });
  } catch (e) {
    next(e);
  }
};

export const createProjectTask: RequestHandler = async (req, res, next) => {
  try {
    const projectId = parseId(req.params.projectId, "ID de projeto");
    const { title, description, assigneeUserId, assignee_user_id, dueDate, due_date, stageId, stage_id, toolSlug, tool_slug } = req.body;
    const task = await taskService.createTask(req.user!.id, projectId, {
      title,
      description,
      assigneeUserId: Number(assigneeUserId ?? assignee_user_id),
      dueDate: dueDate ?? due_date ?? null,
      stageId: stageId ?? stage_id ?? null,
      toolSlug: toolSlug ?? tool_slug ?? null,
    });
    res.status(201).json({ success: true, data: task });
  } catch (e) {
    next(e);
  }
};

export const listMyTasks: RequestHandler = async (req, res, next) => {
  try {
    const tasks = await taskService.listMyTasks(req.user!.id);
    res.json({ success: true, data: tasks });
  } catch (e) {
    next(e);
  }
};

export const updateTask: RequestHandler = async (req, res, next) => {
  try {
    const taskId = parseId(req.params.id);
    const { title, description, dueDate, due_date, status, assigneeUserId, assignee_user_id } = req.body;
    const task = await taskService.updateTask(req.user!.id, taskId, {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...((dueDate !== undefined || due_date !== undefined) && { dueDate: dueDate ?? due_date }),
      ...(status !== undefined && { status }),
      ...((assigneeUserId !== undefined || assignee_user_id !== undefined) && {
        assigneeUserId: Number(assigneeUserId ?? assignee_user_id),
      }),
    });
    res.json({ success: true, data: task });
  } catch (e) {
    next(e);
  }
};

export const deleteTask: RequestHandler = async (req, res, next) => {
  try {
    const taskId = parseId(req.params.id);
    await taskService.deleteTask(req.user!.id, taskId);
    res.json({ success: true, data: null });
  } catch (e) {
    next(e);
  }
};
