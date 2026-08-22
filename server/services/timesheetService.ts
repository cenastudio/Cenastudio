import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import type { OperationalPlanId } from "../../shared/planEntitlements.js";

/**
 * Timesheet (spec: landing-features-implementation, F4).
 *
 * At most 1 open TimeEntry (endedAt = null) per user at any instant
 * (Property 6, design.md) — startTimer rejects with 409 if one is already
 * running. Cost = durationSec/3600 * hourlyRate (cents), only when a rate
 * is set (manual entries can supply their own hourlyRate).
 */

export interface TimeEntryRecord {
  id: number;
  user_id: number;
  project_id: number | null;
  project_name?: string | null;
  description: string;
  started_at: string;
  ended_at: string | null;
  duration_sec: number;
  hourly_rate: number | null;
  created_at: string;
}

export interface TimesheetTotals {
  totalDurationSec: number;
  totalCost: number;
}

interface TimesheetFilters {
  projectId?: number;
  from?: string;
  to?: string;
  retentionDays?: number | null;
}

function serializeEntry(value: any): TimeEntryRecord {
  const serialized = withSnakeCase(value, {
    userId: "user_id",
    projectId: "project_id",
    startedAt: "started_at",
    endedAt: "ended_at",
    durationSec: "duration_sec",
    hourlyRate: "hourly_rate",
    createdAt: "created_at",
  }) as Record<string, unknown>;

  if (serialized.project && typeof serialized.project === "object" && "name" in serialized.project) {
    serialized.project_name = (serialized.project as { name?: string | null }).name ?? null;
    delete serialized.project;
  }

  return serialized as unknown as TimeEntryRecord;
}

function entryCost(entry: { duration_sec: number; hourly_rate: number | null }): number {
  if (!entry.hourly_rate) return 0;
  return Math.round((entry.duration_sec / 3600) * entry.hourly_rate);
}

function normalizeDateFilter(value: string | undefined, mode: "from" | "to"): Date | undefined {
  if (!value) return undefined;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly && mode === "to" ? `${value}T23:59:59.999Z` : value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeSqliteDateFilter(value: string | undefined, mode: "from" | "to"): string | undefined {
  const date = normalizeDateFilter(value, mode);
  return date ? date.toISOString() : undefined;
}

export function resolveTimesheetRetentionDays(
  planId: OperationalPlanId | string | null | undefined,
  role?: "user" | "admin",
): number | null {
  if (role === "admin") return null;
  if (planId === "studio" || planId === "whitelabel" || planId === "enterprise") return null;
  if (planId === "pro") return 365;
  return 30;
}

function getRetentionStart(retentionDays?: number | null): Date | undefined {
  if (retentionDays == null) return undefined;
  const safeDays = Math.max(0, retentionDays);
  return new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
}

function getEffectiveFromDate(filters: TimesheetFilters): Date | undefined {
  const from = normalizeDateFilter(filters.from, "from");
  const retentionStart = getRetentionStart(filters.retentionDays);
  if (!from) return retentionStart;
  if (!retentionStart) return from;
  return from > retentionStart ? from : retentionStart;
}

async function assertProjectOwnershipIfProvided(userId: number, projectId?: number | null): Promise<void> {
  if (projectId == null) return;
  if (shouldUsePrisma) {
    const project = await prisma.project.findFirst({ where: { id: BigInt(projectId), userId: BigInt(userId) }, select: { id: true } });
    if (!project) throw new AppError("Projeto não encontrado", 404);
    return;
  }
  const project = db.prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?").get(projectId, userId);
  if (!project) throw new AppError("Projeto não encontrado", 404);
}

/** Lists entries for a user, optionally scoped to a project, most recent first, with aggregate totals. */
export async function listEntries(
  userId: number,
  filters: TimesheetFilters = {},
): Promise<{ entries: TimeEntryRecord[]; totals: TimesheetTotals }> {
  let entries: TimeEntryRecord[];

  if (shouldUsePrisma) {
    const from = getEffectiveFromDate(filters);
    const to = normalizeDateFilter(filters.to, "to");
    const rows = await prisma.timeEntry.findMany({
      where: {
        userId: BigInt(userId),
        ...(filters.projectId ? { projectId: BigInt(filters.projectId) } : {}),
        ...((from || to) ? { startedAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
      },
      include: { project: { select: { name: true } } },
      orderBy: { startedAt: "desc" },
    });
    entries = rows.map(serializeEntry);
  } else {
    const clauses = ["time_entries.user_id = ?"];
    const args: unknown[] = [userId];
    if (filters.projectId) { clauses.push("time_entries.project_id = ?"); args.push(filters.projectId); }
    const from = getEffectiveFromDate(filters)?.toISOString();
    const to = normalizeSqliteDateFilter(filters.to, "to");
    if (from) { clauses.push("time_entries.started_at >= ?"); args.push(from); }
    if (to) { clauses.push("time_entries.started_at <= ?"); args.push(to); }

    const rows = db
      .prepare(`
        SELECT time_entries.*, projects.name AS project_name
        FROM time_entries
        LEFT JOIN projects ON projects.id = time_entries.project_id
        WHERE ${clauses.join(" AND ")}
        ORDER BY started_at DESC
      `)
      .all(...args);
    entries = (rows as any[]).map(serializeEntry);
  }

  const totals = entries.reduce(
    (acc, entry) => ({
      totalDurationSec: acc.totalDurationSec + entry.duration_sec,
      totalCost: acc.totalCost + entryCost(entry),
    }),
    { totalDurationSec: 0, totalCost: 0 },
  );

  return { entries, totals };
}

function escapeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatCsvDate(value: string | null): string {
  return value ? new Date(value).toISOString() : "";
}

/** Exports the filtered ledger as CSV for finance reconciliation. */
export async function exportCSV(userId: number, filters: TimesheetFilters = {}): Promise<string> {
  const { entries, totals } = await listEntries(userId, filters);
  const header = ["Data", "Projeto", "Descricao", "Inicio", "Fim", "Duracao segundos", "Horas", "Taxa hora centavos", "Custo centavos"];
  const rows = entries.map((entry) => [
    entry.started_at.slice(0, 10),
    entry.project_name ?? (entry.project_id ? `Projeto #${entry.project_id}` : "Sem projeto"),
    entry.description,
    formatCsvDate(entry.started_at),
    formatCsvDate(entry.ended_at),
    entry.duration_sec,
    (entry.duration_sec / 3600).toFixed(2),
    entry.hourly_rate ?? "",
    entryCost(entry),
  ]);
  rows.push(["TOTAL", "", "", "", "", totals.totalDurationSec, (totals.totalDurationSec / 3600).toFixed(2), "", totals.totalCost]);
  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

/** The currently running timer for a user (endedAt = null), or null if none. */
export async function getRunningTimer(userId: number): Promise<TimeEntryRecord | null> {
  if (shouldUsePrisma) {
    const entry = await prisma.timeEntry.findFirst({ where: { userId: BigInt(userId), endedAt: null } });
    return entry ? serializeEntry(entry) : null;
  }
  const entry = db.prepare("SELECT * FROM time_entries WHERE user_id = ? AND ended_at IS NULL").get(userId);
  return entry ? serializeEntry(entry) : null;
}

/** Starts a new timer. Rejects with 409 if the user already has one running (Property 6). */
export async function startTimer(
  userId: number,
  data: { projectId?: number | null; description?: string },
): Promise<TimeEntryRecord> {
  const running = await getRunningTimer(userId);
  if (running) throw new AppError("Você já tem um timer em andamento. Pare-o antes de iniciar outro.", 409);

  await assertProjectOwnershipIfProvided(userId, data.projectId);

  if (shouldUsePrisma) {
    const created = await prisma.timeEntry.create({
      data: {
        userId: BigInt(userId),
        projectId: data.projectId != null ? BigInt(data.projectId) : null,
        description: data.description ?? "",
        startedAt: new Date(),
      },
    });
    return serializeEntry(created);
  }

  const result = db
    .prepare(
      `INSERT INTO time_entries (user_id, project_id, description, started_at, duration_sec, created_at)
       VALUES (?, ?, ?, datetime('now'), 0, datetime('now'))`,
    )
    .run(userId, data.projectId ?? null, data.description ?? "");

  return serializeEntry(db.prepare("SELECT * FROM time_entries WHERE id = ?").get((result as any).lastInsertRowid));
}

/** Stops a running timer, computing durationSec from startedAt to now. Rejects if already closed. */
export async function stopTimer(userId: number, entryId: number, hourlyRate?: number | null): Promise<TimeEntryRecord> {
  const entry = await getEntryOwnedByUser(userId, entryId);
  if (entry.ended_at) throw new AppError("Este registro já está fechado", 409);

  const startedAt = new Date(entry.started_at);
  const endedAt = new Date();
  const durationSec = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000));

  if (shouldUsePrisma) {
    const updated = await prisma.timeEntry.update({
      where: { id: BigInt(entryId) },
      data: { endedAt, durationSec, ...(hourlyRate !== undefined ? { hourlyRate } : {}) },
    });
    return serializeEntry(updated);
  }

  const fields = ["ended_at = datetime('now')", "duration_sec = ?"];
  const values: unknown[] = [durationSec];
  if (hourlyRate !== undefined) { fields.push("hourly_rate = ?"); values.push(hourlyRate); }
  db.prepare(`UPDATE time_entries SET ${fields.join(", ")} WHERE id = ?`).run(...values, entryId);

  return serializeEntry(db.prepare("SELECT * FROM time_entries WHERE id = ?").get(entryId));
}

/** Creates a closed manual entry (start, end, optional hourly rate) — no timer involved. */
export async function addManualEntry(
  userId: number,
  data: { projectId?: number | null; description?: string; startedAt: string; endedAt: string; hourlyRate?: number | null },
): Promise<TimeEntryRecord> {
  const startedAt = new Date(data.startedAt);
  const endedAt = new Date(data.endedAt);
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime())) throw new AppError("Datas inválidas", 400);
  if (endedAt < startedAt) throw new AppError("O fim deve ser depois do início", 400);
  if (data.hourlyRate != null && data.hourlyRate < 0) throw new AppError("Taxa horária inválida", 400);

  await assertProjectOwnershipIfProvided(userId, data.projectId);

  const durationSec = Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);

  if (shouldUsePrisma) {
    const created = await prisma.timeEntry.create({
      data: {
        userId: BigInt(userId),
        projectId: data.projectId != null ? BigInt(data.projectId) : null,
        description: data.description ?? "",
        startedAt,
        endedAt,
        durationSec,
        hourlyRate: data.hourlyRate ?? null,
      },
    });
    return serializeEntry(created);
  }

  const result = db
    .prepare(
      `INSERT INTO time_entries (user_id, project_id, description, started_at, ended_at, duration_sec, hourly_rate, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
    .run(userId, data.projectId ?? null, data.description ?? "", data.startedAt, data.endedAt, durationSec, data.hourlyRate ?? null);

  return serializeEntry(db.prepare("SELECT * FROM time_entries WHERE id = ?").get((result as any).lastInsertRowid));
}

async function getEntryOwnedByUser(userId: number, entryId: number): Promise<TimeEntryRecord> {
  if (shouldUsePrisma) {
    const entry = await prisma.timeEntry.findFirst({ where: { id: BigInt(entryId), userId: BigInt(userId) } });
    if (!entry) throw new AppError("Registro não encontrado", 404);
    return serializeEntry(entry);
  }
  const entry = db.prepare("SELECT * FROM time_entries WHERE id = ? AND user_id = ?").get(entryId, userId);
  if (!entry) throw new AppError("Registro não encontrado", 404);
  return serializeEntry(entry);
}

export async function deleteEntry(userId: number, entryId: number): Promise<boolean> {
  if (shouldUsePrisma) {
    const result = await prisma.timeEntry.deleteMany({ where: { id: BigInt(entryId), userId: BigInt(userId) } });
    return result.count > 0;
  }
  const result = db.prepare("DELETE FROM time_entries WHERE id = ? AND user_id = ?").run(entryId, userId);
  return (result as any).changes > 0;
}

export interface TimesheetReportRow {
  projectId: number | null;
  totalDurationSec: number;
  totalCost: number;
}

/** Groups closed entries by project, for a simple per-project cost/hours report. */
export async function getReport(userId: number, filters: Pick<TimesheetFilters, "retentionDays"> = {}): Promise<TimesheetReportRow[]> {
  const { entries } = await listEntries(userId, filters);
  const byProject = new Map<number | null, TimesheetReportRow>();

  for (const entry of entries) {
    const key = entry.project_id;
    const existing = byProject.get(key) ?? { projectId: key, totalDurationSec: 0, totalCost: 0 };
    existing.totalDurationSec += entry.duration_sec;
    existing.totalCost += entryCost(entry);
    byProject.set(key, existing);
  }

  return Array.from(byProject.values());
}
