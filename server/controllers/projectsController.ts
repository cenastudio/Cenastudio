import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbProject, DbProjectState } from "../models/types.js";

function serializeProject(project: DbProject) {
  return {
    ...project,
    userId: project.user_id,
    clientId: project.client_id,
    metadataJson: project.metadata_json,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}

function normalizeMetadataJson(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "{}";

  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    throw new AppError("Metadados inválidos", 400);
  }
}

// List all projects for current user
export const listProjects: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const rows = db
      .prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY id DESC")
      .all(userId) as DbProject[];
    res.json({ success: true, data: rows.map(serializeProject) });
  } catch (e) {
    next(e);
  }
};

// Create a new project
export const createProject: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, description, clientId, metadataJson, metadata_json } = req.body;

    if (!name || !name.trim()) {
      throw new AppError("O nome do projeto é obrigatório", 400);
    }

    const metadata = normalizeMetadataJson(metadataJson ?? metadata_json);

    const result = db
      .prepare(
        "INSERT INTO projects (user_id, name, description, status, metadata_json, client_id) VALUES (?, ?, ?, 'active', ?, ?)",
      )
      .run(userId, name.trim(), description?.trim() || "", metadata, clientId || null);

    const newProject = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(result.lastInsertRowid) as DbProject;

    res.json({ success: true, data: serializeProject(newProject) });
  } catch (e) {
    next(e);
  }
};

// Get specific project details
export const getProject: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;

    const project = db
      .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId) as DbProject | undefined;

    if (!project) {
      throw new AppError("Projeto não encontrado ou acesso não autorizado", 404);
    }

    res.json({ success: true, data: serializeProject(project) });
  } catch (e) {
    next(e);
  }
};

// Update project metadata
export const updateProject: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const { name, description, status, metadata_json, metadataJson } = req.body;

    const project = db
      .prepare("SELECT * FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId) as DbProject | undefined;

    if (!project) {
      throw new AppError("Projeto não encontrado ou acesso não autorizado", 404);
    }

    const nextMetadata =
      metadata_json !== undefined || metadataJson !== undefined
        ? normalizeMetadataJson(metadataJson ?? metadata_json)
        : project.metadata_json;

    db.prepare(
      `UPDATE projects SET
        name = ?,
        description = ?,
        status = ?,
        metadata_json = ?,
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?`,
    ).run(
      name?.trim() ?? project.name,
      description?.trim() ?? project.description,
      status ?? project.status,
      nextMetadata,
      projectId,
      userId,
    );

    const updated = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(projectId) as DbProject;

    res.json({ success: true, data: serializeProject(updated) });
  } catch (e) {
    next(e);
  }
};

// Delete project
export const deleteProject: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;

    const result = db
      .prepare("DELETE FROM projects WHERE id = ? AND user_id = ?")
      .run(projectId, userId);

    if (result.changes === 0) {
      throw new AppError("Projeto não encontrado ou acesso não autorizado", 404);
    }

    res.json({ success: true, data: { id: Number(projectId) } });
  } catch (e) {
    next(e);
  }
};

// Save tool state (Autosave)
export const saveToolState: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const { toolId, formData, outputData } = req.body;

    if (!toolId) {
      throw new AppError("ID da ferramenta é obrigatório", 400);
    }

    // Verify project ownership
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId);

    if (!project) {
      throw new AppError("Projeto não encontrado ou acesso não autorizado", 403);
    }

    db.prepare(
      `INSERT INTO project_states (project_id, tool_id, form_data, output_data, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(project_id, tool_id) DO UPDATE SET
         form_data = excluded.form_data,
         output_data = excluded.output_data,
         updated_at = datetime('now')`,
    ).run(
      projectId,
      toolId,
      formData ? JSON.stringify(formData) : "{}",
      outputData || "",
    );

    res.json({ success: true, data: { projectId: Number(projectId), toolId } });
  } catch (e) {
    next(e);
  }
};

// Get tool state
export const getToolState: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const { toolId } = req.params;

    // Verify project ownership
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId);

    if (!project) {
      throw new AppError("Projeto não encontrado ou acesso não autorizado", 403);
    }

    const state = db
      .prepare("SELECT * FROM project_states WHERE project_id = ? AND tool_id = ?")
      .get(projectId, toolId) as DbProjectState | undefined;

    if (!state) {
      res.json({ success: true, data: null });
      return;
    }

    let parsedForm: Record<string, string> = {};
    try {
      parsedForm = JSON.parse(state.form_data);
    } catch {
      parsedForm = {};
    }

    res.json({
      success: true,
      data: {
        projectId: state.project_id,
        toolId: state.tool_id,
        formData: parsedForm,
        outputData: state.output_data,
        updatedAt: state.updated_at,
      },
    });
  } catch (e) {
    next(e);
  }
};

// List populated tool states for a project (lightweight check for filled timeline steps)
export const listProjectStates: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;

    // Verify project ownership
    const project = db
      .prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?")
      .get(projectId, userId);

    if (!project) {
      throw new AppError("Projeto não encontrado ou acesso não autorizado", 403);
    }

    const states = db
      .prepare("SELECT tool_id as toolId, updated_at as updatedAt FROM project_states WHERE project_id = ?")
      .all(projectId);

    res.json({ success: true, data: states });
  } catch (e) {
    next(e);
  }
};

// Get recent activities (last 10 AI generations across all tools with project name)
export const getRecentActivities: RequestHandler = (req, res, next) => {
  try {
    const userId = req.user!.id;
    const rows = db
      .prepare(
        `SELECT g.id, g.tool_id as toolId, g.created_at as createdAt, g.project_id as projectId, p.name as projectName
         FROM generations g
         LEFT JOIN projects p ON g.project_id = p.id
         WHERE g.user_id = ?
         ORDER BY g.id DESC LIMIT 10`
      )
      .all(userId);
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};
