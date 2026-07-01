import type { RequestHandler } from "express";
import { db } from "../models/db.js";
import { AppError } from "../middleware/errorHandler.js";
import type { DbProject, DbProjectState } from "../models/types.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { jsonSafe } from "../utils/prismaSerialization.js";

function serializeProject(project: DbProject) {
  const withClient = project as DbProject & { client_name?: string | null };

  return {
    ...project,
    userId: project.user_id,
    clientId: project.client_id,
    clientName: withClient.client_name ?? null,
    metadataJson: project.metadata_json,
    createdAt: project.created_at,
    updatedAt: project.updated_at,
  };
}

function serializePrismaProject(project: any) {
  const safe = jsonSafe(project) as any;
  const clientName = safe.client?.company || safe.client?.name || null;
  delete safe.client;
  return {
    ...safe,
    user_id: safe.userId,
    client_id: safe.clientId,
    clientName,
    client_name: clientName,
    metadataJson: JSON.stringify(safe.metadataJson || {}),
    metadata_json: JSON.stringify(safe.metadataJson || {}),
    created_at: safe.createdAt,
    updated_at: safe.updatedAt,
  };
}

function positiveBigInt(value: unknown, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AppError(`${label} inválido`, 400);
  return BigInt(parsed);
}

function normalizeMetadataJson(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "{}";

  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    throw new AppError("Metadados inválidos", 400);
  }
}

async function normalizeOwnedClientId(value: unknown, userId: number): Promise<number | null> {
  if (value === undefined || value === null || value === "") return null;
  const clientId = Number(value);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw new AppError("Cliente inválido", 400);
  }

  const client = shouldUsePrisma
    ? await prisma.client.findFirst({
        where: { id: BigInt(clientId), userId: BigInt(userId) },
        select: { id: true },
      })
    : db.prepare("SELECT id FROM clients WHERE id = ? AND user_id = ?").get(clientId, userId);
  if (!client) throw new AppError("Cliente não encontrado ou acesso não autorizado", 404);
  return clientId;
}

// List all projects for current user
export const listProjects: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const projects = await prisma.project.findMany({
        where: { userId: BigInt(userId) },
        include: { client: { select: { name: true, company: true } } },
        orderBy: { id: "desc" },
      });
      res.json({ success: true, data: projects.map(serializePrismaProject) });
      return;
    }
    const rows = db
      .prepare(
        `SELECT p.*, COALESCE(c.company, c.name) AS client_name
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id AND c.user_id = p.user_id
         WHERE p.user_id = ?
         ORDER BY p.id DESC`,
      )
      .all(userId) as DbProject[];
    res.json({ success: true, data: rows.map(serializeProject) });
  } catch (e) {
    next(e);
  }
};

// Create a new project
export const createProject: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { name, description, clientId, metadataJson, metadata_json } = req.body;

    if (!name || !name.trim()) {
      throw new AppError("O nome do projeto é obrigatório", 400);
    }

    const metadata = normalizeMetadataJson(metadataJson ?? metadata_json);
    const ownedClientId = await normalizeOwnedClientId(clientId, userId);

    if (shouldUsePrisma) {
      const created = await prisma.project.create({
        data: {
          userId: BigInt(userId),
          clientId: ownedClientId ? BigInt(ownedClientId) : null,
          name: name.trim(),
          description: description?.trim() || "",
          status: "active",
          metadataJson: JSON.parse(metadata),
        },
        include: { client: { select: { name: true, company: true } } },
      });
      res.json({ success: true, data: serializePrismaProject(created) });
      return;
    }

    const result = db
      .prepare(
        "INSERT INTO projects (user_id, name, description, status, metadata_json, client_id) VALUES (?, ?, ?, 'active', ?, ?)",
      )
      .run(userId, name.trim(), description?.trim() || "", metadata, ownedClientId);

    const newProject = db
      .prepare(
        `SELECT p.*, COALESCE(c.company, c.name) AS client_name
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id AND c.user_id = p.user_id
         WHERE p.id = ?`,
      )
      .get(result.lastInsertRowid) as DbProject;

    res.json({ success: true, data: serializeProject(newProject) });
  } catch (e) {
    next(e);
  }
};

// Get specific project details
export const getProject: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;

    if (shouldUsePrisma) {
      const project = await prisma.project.findFirst({
        where: { id: positiveBigInt(projectId, "Projeto"), userId: BigInt(userId) },
        include: { client: { select: { name: true, company: true } } },
      });
      if (!project) throw new AppError("Projeto não encontrado ou acesso não autorizado", 404);
      res.json({ success: true, data: serializePrismaProject(project) });
      return;
    }

    const project = db
      .prepare(
        `SELECT p.*, COALESCE(c.company, c.name) AS client_name
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id AND c.user_id = p.user_id
         WHERE p.id = ? AND p.user_id = ?`,
      )
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
export const updateProject: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const { name, description, status, clientId, metadata_json, metadataJson } = req.body;

    if (shouldUsePrisma) {
      const id = positiveBigInt(projectId, "Projeto");
      const project = await prisma.project.findFirst({ where: { id, userId: BigInt(userId) } });
      if (!project) throw new AppError("Projeto não encontrado ou acesso não autorizado", 404);
      const nextClientId = clientId !== undefined
        ? await normalizeOwnedClientId(clientId, userId)
        : project.clientId === null ? null : Number(project.clientId);
      const metadata = metadata_json !== undefined || metadataJson !== undefined
        ? JSON.parse(normalizeMetadataJson(metadataJson ?? metadata_json))
        : project.metadataJson;
      const updated = await prisma.project.update({
        where: { id },
        data: {
          name: name?.trim() ?? project.name,
          description: description?.trim() ?? project.description,
          status: status ?? project.status,
          clientId: nextClientId ? BigInt(nextClientId) : null,
          metadataJson: metadata as any,
          updatedAt: new Date(),
        },
        include: { client: { select: { name: true, company: true } } },
      });
      res.json({ success: true, data: serializePrismaProject(updated) });
      return;
    }

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
    const nextClientId =
      clientId !== undefined ? await normalizeOwnedClientId(clientId, userId) : project.client_id;

    db.prepare(
      `UPDATE projects SET
        name = ?,
        description = ?,
        status = ?,
        client_id = ?,
        metadata_json = ?,
        updated_at = datetime('now')
      WHERE id = ? AND user_id = ?`,
    ).run(
      name?.trim() ?? project.name,
      description?.trim() ?? project.description,
      status ?? project.status,
      nextClientId,
      nextMetadata,
      projectId,
      userId,
    );

    const updated = db
      .prepare(
        `SELECT p.*, COALESCE(c.company, c.name) AS client_name
         FROM projects p
         LEFT JOIN clients c ON c.id = p.client_id AND c.user_id = p.user_id
         WHERE p.id = ?`,
      )
      .get(projectId) as DbProject;

    res.json({ success: true, data: serializeProject(updated) });
  } catch (e) {
    next(e);
  }
};

// Delete project
export const deleteProject: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;

    if (shouldUsePrisma) {
      const result = await prisma.project.deleteMany({
        where: { id: positiveBigInt(projectId, "Projeto"), userId: BigInt(userId) },
      });
      if (result.count === 0) throw new AppError("Projeto não encontrado ou acesso não autorizado", 404);
      res.json({ success: true, data: { id: Number(projectId) } });
      return;
    }

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
export const saveToolState: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const { toolId, formData, outputData } = req.body;

    if (!toolId) {
      throw new AppError("ID da ferramenta é obrigatório", 400);
    }

    if (shouldUsePrisma) {
      const id = positiveBigInt(projectId, "Projeto");
      const project = await prisma.project.findFirst({
        where: { id, userId: BigInt(userId) },
        select: { id: true },
      });
      if (!project) throw new AppError("Projeto não encontrado ou acesso não autorizado", 403);
      await prisma.projectState.upsert({
        where: { projectId_toolId: { projectId: id, toolId } },
        create: {
          projectId: id,
          toolId,
          formData: formData || {},
          outputData: outputData || "",
        },
        update: {
          formData: formData || {},
          outputData: outputData || "",
          updatedAt: new Date(),
        },
      });
      res.json({ success: true, data: { projectId: Number(projectId), toolId } });
      return;
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
export const getToolState: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;
    const { toolId } = req.params;

    if (shouldUsePrisma) {
      const id = positiveBigInt(projectId, "Projeto");
      const project = await prisma.project.findFirst({
        where: { id, userId: BigInt(userId) },
        select: { id: true },
      });
      if (!project) throw new AppError("Projeto não encontrado ou acesso não autorizado", 403);
      const state = await prisma.projectState.findUnique({
        where: { projectId_toolId: { projectId: id, toolId } },
      });
      res.json({
        success: true,
        data: state
          ? {
              projectId: Number(state.projectId),
              toolId: state.toolId,
              formData: jsonSafe(state.formData || {}),
              outputData: state.outputData,
              updatedAt: state.updatedAt.toISOString(),
            }
          : null,
      });
      return;
    }

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
export const listProjectStates: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const projectId = req.params.id;

    if (shouldUsePrisma) {
      const id = positiveBigInt(projectId, "Projeto");
      const project = await prisma.project.findFirst({
        where: { id, userId: BigInt(userId) },
        select: { id: true },
      });
      if (!project) throw new AppError("Projeto não encontrado ou acesso não autorizado", 403);
      const states = await prisma.projectState.findMany({
        where: { projectId: id },
        select: { toolId: true, updatedAt: true },
      });
      res.json({ success: true, data: jsonSafe(states) });
      return;
    }

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
export const getRecentActivities: RequestHandler = async (req, res, next) => {
  try {
    const userId = req.user!.id;
    if (shouldUsePrisma) {
      const rows = await prisma.generation.findMany({
        where: { userId: BigInt(userId) },
        select: { id: true, toolId: true, createdAt: true, projectId: true, project: { select: { name: true } } },
        orderBy: { id: "desc" },
        take: 10,
      });
      res.json({
        success: true,
        data: rows.map((row) => ({
          id: Number(row.id),
          toolId: row.toolId,
          createdAt: row.createdAt.toISOString(),
          projectId: row.projectId === null ? null : Number(row.projectId),
          projectName: row.project?.name || null,
        })),
      });
      return;
    }
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
