import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";

interface ShotTypeRecord {
  id: number;
  userId: number;
  name: string;
  isDefault: boolean;
  createdAt: Date;
}

function serializeShotType(value: any): ShotTypeRecord {
  return {
    id: Number(value.id),
    userId: Number(value.user_id ?? value.userId),
    name: value.name,
    isDefault: Boolean(value.is_default ?? value.isDefault),
    createdAt: new Date(value.created_at ?? value.createdAt),
  };
}

/**
 * Get all shot types for a user (custom + defaults)
 */
export async function listShotTypes(userId: number): Promise<ShotTypeRecord[]> {
  if (shouldUsePrisma) {
    const types = await prisma.shotType.findMany({
      where: { userId: BigInt(userId) },
      orderBy: [
        { isDefault: 'desc' }, // Defaults first
        { name: 'asc' },
      ],
    });
    return types.map(serializeShotType);
  } else {
    const rows = db
      .prepare(
        `SELECT id, user_id, name, is_default, created_at
         FROM shot_types
         WHERE user_id = ?
         ORDER BY is_default DESC, name ASC`,
      )
      .all(userId);
    return rows.map(serializeShotType);
  }
}

/**
 * Add a custom shot type
 */
export async function addShotType(userId: number, name: string): Promise<ShotTypeRecord> {
  if (!name.trim()) {
    throw new Error("Nome do tipo não pode estar vazio");
  }

  // Check for duplicate name (case-insensitive)
  const existing = await listShotTypes(userId);
  if (existing.some(t => t.name.toLowerCase() === name.trim().toLowerCase())) {
    throw new Error("Já existe um tipo com esse nome");
  }

  if (shouldUsePrisma) {
    const type = await prisma.shotType.create({
      data: {
        userId: BigInt(userId),
        name: name.trim(),
        isDefault: false,
      },
    });
    return serializeShotType(type);
  } else {
    const result = db
      .prepare(
        `INSERT INTO shot_types (user_id, name, is_default, created_at)
         VALUES (?, ?, false, datetime('now'))`,
      )
      .run(userId, name.trim());
    const row = db
      .prepare("SELECT id, user_id, name, is_default, created_at FROM shot_types WHERE id = ?")
      .get(result.lastInsertRowid);
    return serializeShotType(row);
  }
}

/**
 * Delete a custom shot type (cannot delete defaults)
 */
export async function deleteShotType(userId: number, typeId: number): Promise<boolean> {
  if (shouldUsePrisma) {
    const type = await prisma.shotType.findFirst({
      where: {
        id: BigInt(typeId),
        userId: BigInt(userId),
      },
    });

    if (!type) {
      throw new Error("Tipo não encontrado");
    }

    if (type.isDefault) {
      throw new Error("Não é possível deletar tipos padrão");
    }

    await prisma.shotType.delete({
      where: { id: BigInt(typeId) },
    });
    return true;
  } else {
    const type = db
      .prepare(
        `SELECT id, is_default FROM shot_types WHERE id = ? AND user_id = ?`,
      )
      .get(typeId, userId) as { id: number; is_default: number } | undefined;

    if (!type) {
      throw new Error("Tipo não encontrado");
    }

    if (type.is_default) {
      throw new Error("Não é possível deletar tipos padrão");
    }

    db.prepare("DELETE FROM shot_types WHERE id = ?").run(typeId);
    return true;
  }
}

/**
 * Initialize default shot types for a user (called on first use)
 */
export async function ensureDefaultShotTypes(userId: number): Promise<void> {
  const existing = await listShotTypes(userId);
  if (existing.length > 0) return; // Already initialized

  const defaultTypes = ["Wide", "Médio", "Close", "Detalhe", "Plongée", "Contra-plongée"];

  if (shouldUsePrisma) {
    await prisma.shotType.createMany({
      data: defaultTypes.map(name => ({
        userId: BigInt(userId),
        name,
        isDefault: true,
      })),
    });
  } else {
    const stmt = db.prepare(
      `INSERT INTO shot_types (user_id, name, is_default, created_at)
       VALUES (?, ?, true, datetime('now'))`,
    );
    for (const name of defaultTypes) {
      stmt.run(userId, name);
    }
  }
}
