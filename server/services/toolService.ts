import { db } from "../models/db.js";
import { getToolById, TOOLS } from "../../shared/tools.js";
import { AppError } from "../middleware/errorHandler.js";
import type { CreateToolInput, UpdateToolInput } from "../schemas/admin.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

export interface DbTool {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  is_active: number;
  updated_at: string;
}

function mapTool(row: DbTool) {
  const meta = getToolById(row.id);
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? meta?.description ?? "",
    category: row.category ?? meta?.category ?? "",
    isActive: row.is_active === 1,
    icon: meta?.icon ?? "🎬",
    tags: meta?.tags ?? [],
    slug: meta?.slug ?? row.id,
    processingTime: meta?.processingTime,
    placeholder: meta?.placeholder,
  };
}

export async function listActiveTools() {
  if (shouldUsePrisma) {
    const rows = await prisma.tool.findMany({ where: { isActive: true }, orderBy: { id: "asc" } });
    return rows.map((row) => mapTool({ ...row, is_active: row.isActive ? 1 : 0, updated_at: row.updatedAt.toISOString() }));
  }
  const rows = db
    .prepare("SELECT * FROM tools WHERE is_active = 1 ORDER BY id")
    .all() as DbTool[];
  return rows.map(mapTool);
}

export async function listAllTools() {
  if (shouldUsePrisma) {
    const rows = await prisma.tool.findMany({ orderBy: { id: "asc" } });
    return rows.map((row) => mapTool({ ...row, is_active: row.isActive ? 1 : 0, updated_at: row.updatedAt.toISOString() }));
  }
  const rows = db.prepare("SELECT * FROM tools ORDER BY id").all() as DbTool[];
  return rows.map(mapTool);
}

export async function getTool(id: string) {
  if (shouldUsePrisma) {
    const row = await prisma.tool.findUnique({ where: { id } });
    if (!row?.isActive) throw new AppError("Tool not found", 404);
    return mapTool({ ...row, is_active: 1, updated_at: row.updatedAt.toISOString() });
  }
  const row = db.prepare("SELECT * FROM tools WHERE id = ?").get(id) as DbTool | undefined;
  if (!row || row.is_active === 0) {
    throw new AppError("Tool not found", 404);
  }
  return mapTool(row);
}

export async function getToolAdmin(id: string) {
  if (shouldUsePrisma) {
    const row = await prisma.tool.findUnique({ where: { id } });
    if (!row) throw new AppError("Tool not found", 404);
    return mapTool({ ...row, is_active: row.isActive ? 1 : 0, updated_at: row.updatedAt.toISOString() });
  }
  const row = db.prepare("SELECT * FROM tools WHERE id = ?").get(id) as DbTool | undefined;
  if (!row) throw new AppError("Tool not found", 404);
  return mapTool(row);
}

export async function updateTool(id: string, data: UpdateToolInput) {
  if (shouldUsePrisma) {
    const current = await prisma.tool.findUnique({ where: { id } });
    if (!current) throw new AppError("Tool not found", 404);
    await prisma.tool.update({ where: { id }, data: {
      name: data.name ?? current.name, description: data.description ?? current.description,
      category: data.category ?? current.category,
      isActive: data.is_active ?? current.isActive, updatedAt: new Date(),
    } });
    return getToolAdmin(id);
  }
  const existing = db.prepare("SELECT id FROM tools WHERE id = ?").get(id);
  if (!existing) throw new AppError("Tool not found", 404);

  const current = db.prepare("SELECT * FROM tools WHERE id = ?").get(id) as DbTool;
  db.prepare(
    `UPDATE tools SET
      name = ?,
      description = ?,
      category = ?,
      is_active = ?,
      updated_at = datetime('now')
    WHERE id = ?`,
  ).run(
    data.name ?? current.name,
    data.description ?? current.description,
    data.category ?? current.category,
    data.is_active !== undefined ? (data.is_active ? 1 : 0) : current.is_active,
    id,
  );
  return getToolAdmin(id);
}

export async function createTool(data: CreateToolInput) {
  if (shouldUsePrisma) {
    if (await prisma.tool.findUnique({ where: { id: data.id } })) throw new AppError("Tool ID already exists", 400);
    await prisma.tool.create({ data: {
      id: data.id, name: data.name, description: data.description ?? "", category: data.category ?? "",
    } });
    return getToolAdmin(data.id);
  }
  if (db.prepare("SELECT id FROM tools WHERE id = ?").get(data.id)) {
    throw new AppError("Tool ID already exists", 400);
  }
  db.prepare(
    "INSERT INTO tools (id, name, description, category, is_active) VALUES (?, ?, ?, ?, 1)",
  ).run(data.id, data.name, data.description ?? "", data.category ?? "");
  return getToolAdmin(data.id);
}

export async function softDeleteTool(id: string) {
  if (shouldUsePrisma) {
    const result = await prisma.tool.updateMany({ where: { id }, data: { isActive: false, updatedAt: new Date() } });
    if (!result.count) throw new AppError("Tool not found", 404);
    return { id, isActive: false };
  }
  const result = db
    .prepare("UPDATE tools SET is_active = 0, updated_at = datetime('now') WHERE id = ?")
    .run(id);
  if (result.changes === 0) throw new AppError("Tool not found", 404);
  return { id, isActive: false };
}

/** Ensure static metadata exists for all 12 tools */
export function syncToolsFromDefinitions() {
  for (const t of TOOLS) {
    db.prepare(
      `INSERT INTO tools (id, name, description, category, is_active)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(id) DO NOTHING`,
    ).run(t.id, t.name, t.description, t.category);
  }
}
