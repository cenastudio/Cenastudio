import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";

/**
 * Equipment Inventory (spec: landing-features-implementation, F2).
 *
 * CRUD for owned/rented gear + booking per project with overlap detection
 * (Property 4, design.md): checkAvailability(equipmentId, start, end) is
 * false iff some active ("booked") booking for that equipment intersects
 * [start, end].
 */

export interface EquipmentSpecs {
  [key: string]: string | number | boolean;
}

export interface EquipmentRecord {
  id: number;
  user_id: number;
  name: string;
  category: string;
  specs: EquipmentSpecs;
  status: string;
  cost_per_day: number | null;
  is_owned: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookingRecord {
  id: number;
  equipment_id: number;
  project_id: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

function parseSpecs(value: unknown): EquipmentSpecs {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as EquipmentSpecs;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function serializeEquipment(value: any): EquipmentRecord {
  const safe = withSnakeCase(value, {
    userId: "user_id",
    costPerDay: "cost_per_day",
    isOwned: "is_owned",
    createdAt: "created_at",
    updatedAt: "updated_at",
  }) as any;
  return { ...safe, specs: parseSpecs(safe.specs), is_owned: Boolean(safe.is_owned) };
}

function serializeBooking(value: any): BookingRecord {
  const safe = withSnakeCase(value, {
    equipmentId: "equipment_id",
    projectId: "project_id",
    startDate: "start_date",
    endDate: "end_date",
    createdAt: "created_at",
  }) as any;
  return safe;
}

async function assertProjectOwnership(userId: number, projectId: number): Promise<void> {
  if (shouldUsePrisma) {
    const project = await prisma.project.findFirst({
      where: { id: BigInt(projectId), userId: BigInt(userId) },
      select: { id: true },
    });
    if (!project) throw new AppError("Projeto não encontrado", 404);
    return;
  }
  const project = db.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?").get(projectId, userId);
  if (!project) throw new AppError("Projeto não encontrado", 404);
}

export async function listEquipment(userId: number): Promise<EquipmentRecord[]> {
  if (shouldUsePrisma) {
    const rows = await prisma.equipment.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(serializeEquipment);
  }

  const rows = db.prepare("SELECT * FROM equipment WHERE user_id = ? ORDER BY created_at DESC").all(userId);
  return (rows as any[]).map(serializeEquipment);
}

export async function createEquipment(
  userId: number,
  data: { name: string; category: string; specs?: EquipmentSpecs; costPerDay?: number | null; isOwned?: boolean },
): Promise<EquipmentRecord> {
  if (!data.name?.trim()) throw new AppError("Nome é obrigatório", 400);
  if (!data.category?.trim()) throw new AppError("Categoria é obrigatória", 400);
  if (data.costPerDay != null && data.costPerDay < 0) throw new AppError("Custo por dia inválido", 400);

  const specs = data.specs ?? {};
  const isOwned = data.isOwned ?? true;

  if (shouldUsePrisma) {
    const created = await prisma.equipment.create({
      data: {
        userId: BigInt(userId),
        name: data.name.trim(),
        category: data.category.trim(),
        specs,
        costPerDay: data.costPerDay ?? null,
        isOwned,
      },
    });
    return serializeEquipment(created);
  }

  const result = db
    .prepare(
      `INSERT INTO equipment (user_id, name, category, specs, cost_per_day, is_owned, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    )
    .run(userId, data.name.trim(), data.category.trim(), JSON.stringify(specs), data.costPerDay ?? null, isOwned ? 1 : 0);

  return serializeEquipment(db.prepare("SELECT * FROM equipment WHERE id = ?").get((result as any).lastInsertRowid));
}

export async function updateEquipment(
  userId: number,
  equipmentId: number,
  data: { name?: string; category?: string; specs?: EquipmentSpecs; status?: string; costPerDay?: number | null; isOwned?: boolean },
): Promise<EquipmentRecord> {
  if (data.costPerDay != null && data.costPerDay < 0) throw new AppError("Custo por dia inválido", 400);

  if (shouldUsePrisma) {
    const result = await prisma.equipment.updateMany({
      where: { id: BigInt(equipmentId), userId: BigInt(userId) },
      data: { ...data, updatedAt: new Date() },
    });
    if (result.count === 0) throw new AppError("Equipamento não encontrado", 404);
    const updated = await prisma.equipment.findUnique({ where: { id: BigInt(equipmentId) } });
    return serializeEquipment(updated);
  }

  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { fields.push("name = ?"); values.push(data.name.trim()); }
  if (data.category !== undefined) { fields.push("category = ?"); values.push(data.category.trim()); }
  if (data.specs !== undefined) { fields.push("specs = ?"); values.push(JSON.stringify(data.specs)); }
  if (data.status !== undefined) { fields.push("status = ?"); values.push(data.status); }
  if (data.costPerDay !== undefined) { fields.push("cost_per_day = ?"); values.push(data.costPerDay); }
  if (data.isOwned !== undefined) { fields.push("is_owned = ?"); values.push(data.isOwned ? 1 : 0); }
  if (fields.length === 0) throw new AppError("Nada para atualizar", 400);

  fields.push("updated_at = datetime('now')");
  const result = db
    .prepare(`UPDATE equipment SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`)
    .run(...values, equipmentId, userId);
  if ((result as any).changes === 0) throw new AppError("Equipamento não encontrado", 404);

  return serializeEquipment(db.prepare("SELECT * FROM equipment WHERE id = ?").get(equipmentId));
}

export async function deleteEquipment(userId: number, equipmentId: number): Promise<boolean> {
  if (shouldUsePrisma) {
    const result = await prisma.equipment.deleteMany({ where: { id: BigInt(equipmentId), userId: BigInt(userId) } });
    return result.count > 0;
  }
  const result = db.prepare("DELETE FROM equipment WHERE id = ? AND user_id = ?").run(equipmentId, userId);
  return (result as any).changes > 0;
}

/** Ownership-checked equipment lookup, used before booking operations. */
async function getOwnedEquipment(userId: number, equipmentId: number) {
  if (shouldUsePrisma) {
    const equipment = await prisma.equipment.findFirst({ where: { id: BigInt(equipmentId), userId: BigInt(userId) } });
    if (!equipment) throw new AppError("Equipamento não encontrado", 404);
    return equipment;
  }
  const equipment = db.prepare("SELECT * FROM equipment WHERE id = ? AND user_id = ?").get(equipmentId, userId);
  if (!equipment) throw new AppError("Equipamento não encontrado", 404);
  return equipment;
}

/**
 * True iff the equipment is free for [start, end] — i.e. no existing "booked"
 * booking for it overlaps the requested range (Property 4, design.md).
 * Overlap test: existing.start <= requested.end AND existing.end >= requested.start.
 */
export async function checkAvailability(
  userId: number,
  equipmentId: number,
  start: string,
  end: string,
  excludeBookingId?: number,
): Promise<boolean> {
  await getOwnedEquipment(userId, equipmentId);

  if (shouldUsePrisma) {
    const overlapping = await prisma.equipmentBooking.findFirst({
      where: {
        equipmentId: BigInt(equipmentId),
        status: "booked",
        ...(excludeBookingId ? { id: { not: BigInt(excludeBookingId) } } : {}),
        startDate: { lte: new Date(end) },
        endDate: { gte: new Date(start) },
      },
      select: { id: true },
    });
    return !overlapping;
  }

  const excludeClause = excludeBookingId ? "AND id != ?" : "";
  const args = excludeBookingId ? [equipmentId, end, start, excludeBookingId] : [equipmentId, end, start];
  const overlapping = db
    .prepare(
      `SELECT id FROM equipment_bookings
       WHERE equipment_id = ? AND status = 'booked' ${excludeClause}
       AND start_date <= ? AND end_date >= ?`,
    )
    .get(...args);
  return !overlapping;
}

export async function createBooking(
  userId: number,
  data: { equipmentId: number; projectId: number; startDate: string; endDate: string },
): Promise<BookingRecord> {
  if (!data.startDate || !data.endDate) throw new AppError("Datas são obrigatórias", 400);
  if (new Date(data.startDate) > new Date(data.endDate)) throw new AppError("Data de início deve ser antes da data de fim", 400);

  await getOwnedEquipment(userId, data.equipmentId);
  await assertProjectOwnership(userId, data.projectId);

  const available = await checkAvailability(userId, data.equipmentId, data.startDate, data.endDate);
  if (!available) {
    throw new AppError("Este equipamento já está reservado para o período selecionado", 409);
  }

  if (shouldUsePrisma) {
    const created = await prisma.equipmentBooking.create({
      data: {
        equipmentId: BigInt(data.equipmentId),
        projectId: BigInt(data.projectId),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
    return serializeBooking(created);
  }

  const result = db
    .prepare(
      `INSERT INTO equipment_bookings (equipment_id, project_id, start_date, end_date, status, created_at)
       VALUES (?, ?, ?, ?, 'booked', datetime('now'))`,
    )
    .run(data.equipmentId, data.projectId, data.startDate, data.endDate);

  return serializeBooking(db.prepare("SELECT * FROM equipment_bookings WHERE id = ?").get((result as any).lastInsertRowid));
}

export async function cancelBooking(userId: number, bookingId: number): Promise<boolean> {
  // Ownership enforced via the equipment's user_id (bookings don't carry userId directly).
  if (shouldUsePrisma) {
    const booking = await prisma.equipmentBooking.findUnique({
      where: { id: BigInt(bookingId) },
      include: { equipment: { select: { userId: true } } },
    });
    if (!booking || Number(booking.equipment.userId) !== userId) return false;
    await prisma.equipmentBooking.update({ where: { id: BigInt(bookingId) }, data: { status: "cancelled" } });
    return true;
  }

  const booking = db
    .prepare(
      `SELECT eb.id FROM equipment_bookings eb
       JOIN equipment e ON e.id = eb.equipment_id
       WHERE eb.id = ? AND e.user_id = ?`,
    )
    .get(bookingId, userId);
  if (!booking) return false;

  db.prepare("UPDATE equipment_bookings SET status = 'cancelled' WHERE id = ?").run(bookingId);
  return true;
}

export async function listBookingsForEquipment(userId: number, equipmentId: number): Promise<BookingRecord[]> {
  await getOwnedEquipment(userId, equipmentId);

  if (shouldUsePrisma) {
    const rows = await prisma.equipmentBooking.findMany({
      where: { equipmentId: BigInt(equipmentId) },
      orderBy: { startDate: "asc" },
    });
    return rows.map(serializeBooking);
  }

  const rows = db
    .prepare("SELECT * FROM equipment_bookings WHERE equipment_id = ? ORDER BY start_date ASC")
    .all(equipmentId);
  return (rows as any[]).map(serializeBooking);
}
