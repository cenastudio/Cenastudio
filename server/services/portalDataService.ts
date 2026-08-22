import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { withSnakeCase } from "../utils/prismaSerialization.js";
import { createProjectFileUrl } from "./supabaseStorage.js";

/**
 * Portal do Cliente (spec: portal-do-cliente) — hub por cliente.
 *
 * Toda função recebe `clientId` (nunca `userId` do cliente-viewer, que não
 * existe) e filtra estritamente por ele. Nunca retorna 403 — sempre 404 se
 * o recurso não pertence ao cliente, para não confirmar existência de dados
 * de outro cliente/produtora (Requisito 6.2, 9.3).
 */

export interface PortalProjectSummary {
  id: number;
  name: string;
  status: string;
  progress: number;
  deadline: string | null;
  createdAt: string;
}

export interface PortalFileSummary {
  id: number;
  originalName: string;
  mimeType: string | null;
  size: number | null;
  projectId: number;
  projectName: string;
  createdAt: string;
}

export interface PortalFinancialSummary {
  totalPending: number; // centavos
  totalPaid: number; // centavos
  currency: string;
}

function serializeProject(value: any): PortalProjectSummary {
  const row = withSnakeCase(value, { createdAt: "created_at" }) as any;
  return {
    id: Number(row.id),
    name: row.name,
    status: row.status,
    progress: row.progress ?? 0,
    deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function listProjectsForClient(clientId: number): Promise<PortalProjectSummary[]> {
  if (shouldUsePrisma) {
    const rows = await prisma.project.findMany({
      where: { clientId: BigInt(clientId) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(serializeProject);
  }

  const rows = db.prepare("SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC").all(clientId);
  return (rows as any[]).map(serializeProject);
}

export async function getProjectForClient(clientId: number, projectId: number): Promise<PortalProjectSummary> {
  if (shouldUsePrisma) {
    const row = await prisma.project.findFirst({ where: { id: BigInt(projectId), clientId: BigInt(clientId) } });
    if (!row) throw new AppError("Projeto não encontrado", 404);
    return serializeProject(row);
  }

  const row = db.prepare("SELECT * FROM projects WHERE id = ? AND client_id = ?").get(projectId, clientId);
  if (!row) throw new AppError("Projeto não encontrado", 404);
  return serializeProject(row);
}

export async function listFilesForClient(clientId: number): Promise<PortalFileSummary[]> {
  if (shouldUsePrisma) {
    const rows = await prisma.file.findMany({
      where: { visibleInClientPortal: true, project: { clientId: BigInt(clientId) } },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { name: true } } },
    });
    return rows.map((row) => ({
      id: Number(row.id),
      originalName: row.originalName,
      mimeType: row.mimeType,
      size: row.size,
      projectId: Number(row.projectId),
      projectName: row.project?.name ?? "",
      createdAt: row.createdAt.toISOString(),
    }));
  }

  const rows = db
    .prepare(
      `SELECT f.id, f.original_name, f.mime_type, f.size, f.project_id, f.created_at, p.name AS project_name
       FROM files f JOIN projects p ON p.id = f.project_id
       WHERE p.client_id = ? AND f.visible_in_client_portal = 1
       ORDER BY f.created_at DESC`,
    )
    .all(clientId) as any[];
  return rows.map((row) => ({
    id: Number(row.id),
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    projectId: Number(row.project_id),
    projectName: row.project_name,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

/** Retorna a URL de download validando que o arquivo pertence a um projeto do clientId (nunca 403, sempre 404). */
export async function getFileDownloadUrlForClient(clientId: number, fileId: number): Promise<string> {
  if (shouldUsePrisma) {
    const file = await prisma.file.findFirst({
      where: { id: BigInt(fileId), visibleInClientPortal: true, project: { clientId: BigInt(clientId) } },
    });
    if (!file) throw new AppError("Arquivo não encontrado", 404);
    if (file.mimeType === "text/uri-list") return file.path;
    return createProjectFileUrl(file.path);
  }

  const file = db
    .prepare(
      `SELECT f.* FROM files f JOIN projects p ON p.id = f.project_id
       WHERE f.id = ? AND p.client_id = ? AND f.visible_in_client_portal = 1`,
    )
    .get(fileId, clientId) as any;
  if (!file) throw new AppError("Arquivo não encontrado", 404);
  if (file.mime_type === "text/uri-list") return file.path;
  return createProjectFileUrl(file.path);
}

export interface PortalProposalSummary {
  id: number;
  title: string;
  total: number;
  status: string;
  acceptedAt: string | null;
  createdAt: string;
}

export async function listProposalsForClient(clientId: number): Promise<PortalProposalSummary[]> {
  if (!shouldUsePrisma) {
    const rows = db
      .prepare(
        `SELECT id, title, total, status, accepted_at, created_at
         FROM proposals
         WHERE client_id = ? AND visible_in_client_portal = 1 AND status != 'revoked'
         ORDER BY created_at DESC`,
      )
      .all(clientId) as any[];
    return rows.map((row) => ({
      id: Number(row.id),
      title: row.title,
      total: Number(row.total),
      status: row.status,
      acceptedAt: row.accepted_at ? new Date(row.accepted_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    }));
  }

  const rows = await prisma.proposal.findMany({
    where: { clientId: BigInt(clientId), visibleInClientPortal: true, status: { not: "revoked" } },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, total: true, status: true, acceptedAt: true, createdAt: true },
  });
  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    total: row.total,
    status: row.status,
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export interface PortalMeetingSummary {
  id: number;
  title: string;
  location: string | null;
  startsAt: string;
  durationMinutes: number;
  status: string;
}

export async function listMeetingsForClient(clientId: number): Promise<PortalMeetingSummary[]> {
  const rows = await prisma.meeting.findMany({
    where: { clientId: BigInt(clientId), visibleInClientPortal: true, status: { not: "cancelled" } },
    orderBy: { startsAt: "desc" },
    select: { id: true, title: true, location: true, startsAt: true, durationMinutes: true, status: true },
  });
  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    location: row.location,
    startsAt: row.startsAt.toISOString(),
    durationMinutes: row.durationMinutes,
    status: row.status,
  }));
}

/** Apenas totais agregados — nunca a lista bruta de FinancialEntry (que pode ter notas internas). */
export async function getFinancialSummaryForClient(clientId: number): Promise<PortalFinancialSummary> {
  if (shouldUsePrisma) {
    const [pending, paid] = await Promise.all([
      prisma.financialEntry.aggregate({
        where: { clientId: BigInt(clientId), kind: "income", status: { not: "settled" } },
        _sum: { amount: true },
      }),
      prisma.financialEntry.aggregate({
        where: { clientId: BigInt(clientId), kind: "income", status: "settled" },
        _sum: { amount: true },
      }),
    ]);
    return {
      totalPending: pending._sum.amount ?? 0,
      totalPaid: paid._sum.amount ?? 0,
      currency: "BRL",
    };
  }

  const pending = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM financial_entries WHERE client_id = ? AND kind = 'income' AND status != 'settled'",
    )
    .get(clientId) as { total: number };
  const paid = db
    .prepare(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM financial_entries WHERE client_id = ? AND kind = 'income' AND status = 'settled'",
    )
    .get(clientId) as { total: number };
  return {
    totalPending: pending.total,
    totalPaid: paid.total,
    currency: "BRL",
  };
}
