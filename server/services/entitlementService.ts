import type { FeatureFlagId } from "../../shared/planEntitlements.js";
import { getPlanEntitlement, isPlanOperational } from "../../shared/planEntitlements.js";
import { AppError } from "../middleware/errorHandler.js";
import { db } from "../models/db.js";
import { prisma, shouldUsePrisma } from "../models/prisma.js";
import { getUserPlan } from "./authService.js";

export async function getUserEntitlements(userId: number) {
  const plan = await getUserPlan(userId);
  const entitlement = getPlanEntitlement(plan?.plan_id);
  return {
    ...entitlement,
    status: plan?.status ?? "inactive",
    operational: isPlanOperational(entitlement.planId, plan?.status),
  };
}

export async function requireOperationalAccess(userId: number, role?: "user" | "admin") {
  const entitlement = await getUserEntitlements(userId);
  if (role !== "admin" && !entitlement.operational) {
    throw new AppError("Ative o plano Produtora para liberar este espaço de trabalho.", 402);
  }
  return entitlement;
}

export async function getClientAllowance(userId: number) {
  const entitlement = await getUserEntitlements(userId);
  const used = shouldUsePrisma
    ? await prisma.client.count({ where: { userId: BigInt(userId) } })
    : (db.prepare("SELECT COUNT(*) AS count FROM clients WHERE user_id = ?").get(userId) as { count: number }).count;

  return {
    planId: entitlement.planId,
    status: entitlement.status,
    used,
    limit: entitlement.clientLimit,
    remaining: entitlement.clientLimit === null ? null : Math.max(0, entitlement.clientLimit - used),
    canCreate: entitlement.operational && (entitlement.clientLimit === null || used < entitlement.clientLimit),
  };
}

export interface UserUsageMetrics {
  period: string;
  generations: { used: number; limit: number };
  clients: { used: number; limit: number | null };
  projectsThisMonth: number;
  teamMembers: { used: number; limit: number };
  storageBytes: number;
}

export async function getUserUsageMetrics(userId: number): Promise<UserUsageMetrics> {
  const plan = await getUserPlan(userId);
  const entitlement = getPlanEntitlement(plan?.plan_id);
  const period = new Date().toISOString().slice(0, 7);
  const monthStart = new Date(`${period}-01T00:00:00.000Z`);
  const nextMonth = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));

  if (shouldUsePrisma) {
    const uid = BigInt(userId);
    const [generationUsage, clientsUsed, projectsThisMonth, teamMembersUsed, storage] = await Promise.all([
      prisma.usage.aggregate({ where: { userId: uid, period }, _sum: { count: true } }),
      prisma.client.count({ where: { userId: uid } }),
      prisma.project.count({ where: { userId: uid, createdAt: { gte: monthStart, lt: nextMonth } } }),
      prisma.workspaceMember.count({
        where: { workspace: { ownerUserId: uid }, role: { not: "owner" }, status: "active" },
      }),
      prisma.file.aggregate({ where: { userId: uid }, _sum: { size: true } }),
    ]);

    return {
      period,
      generations: { used: generationUsage._sum.count ?? 0, limit: plan?.generation_limit ?? 0 },
      clients: { used: clientsUsed, limit: entitlement.clientLimit },
      projectsThisMonth,
      teamMembers: { used: teamMembersUsed, limit: entitlement.teamMemberLimit },
      storageBytes: Number(storage._sum.size ?? 0),
    };
  }

  const generationUsage = db.prepare(
    "SELECT COALESCE(SUM(count), 0) AS used FROM usage WHERE user_id = ? AND period = ?",
  ).get(userId, period) as { used: number };
  const clientsUsed = db.prepare("SELECT COUNT(*) AS used FROM clients WHERE user_id = ?").get(userId) as { used: number };
  const projectsThisMonth = db.prepare(
    "SELECT COUNT(*) AS used FROM projects WHERE user_id = ? AND strftime('%Y-%m', created_at) = ?",
  ).get(userId, period) as { used: number };
  const teamMembersUsed = db.prepare(
    `SELECT COUNT(*) AS used FROM workspace_members wm
     JOIN workspaces w ON w.id = wm.workspace_id
     WHERE w.owner_user_id = ? AND wm.role != 'owner' AND wm.status = 'active'`,
  ).get(userId) as { used: number };
  const storage = db.prepare(
    "SELECT COALESCE(SUM(size), 0) AS bytes FROM files WHERE user_id = ?",
  ).get(userId) as { bytes: number };

  return {
    period,
    generations: { used: generationUsage.used, limit: plan?.generation_limit ?? 0 },
    clients: { used: clientsUsed.used, limit: entitlement.clientLimit },
    projectsThisMonth: projectsThisMonth.used,
    teamMembers: { used: teamMembersUsed.used, limit: entitlement.teamMemberLimit },
    storageBytes: storage.bytes,
  };
}

/** Bytes de armazenamento atualmente usados pelo usuário (soma dos arquivos). */
export async function getStorageUsedBytes(userId: number): Promise<number> {
  if (shouldUsePrisma) {
    const agg = await prisma.file.aggregate({ where: { userId: BigInt(userId) }, _sum: { size: true } });
    return Number(agg._sum.size ?? 0);
  }
  const row = db.prepare("SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE user_id = ?").get(userId) as { used: number };
  return Number(row.used ?? 0);
}

/** Quota de armazenamento (bytes) do plano do usuário. -1 = ilimitado. */
export async function getStorageQuotaBytes(userId: number): Promise<number> {
  const entitlement = await getUserEntitlements(userId);
  return entitlement.storageLimitBytes;
}

/**
 * Garante que o upload de `incomingBytes` cabe na quota do plano.
 * Lança AppError(413) quando o total ultrapassaria o limite. Admins e planos
 * ilimitados (-1) passam direto.
 */
export async function assertStorageCapacity(
  userId: number,
  incomingBytes: number,
  role?: "user" | "admin",
) {
  if (role === "admin") return;
  const quota = await getStorageQuotaBytes(userId);
  if (quota < 0) return; // unlimited
  const used = await getStorageUsedBytes(userId);
  if (used + Math.max(0, incomingBytes) > quota) {
    const quotaGb = (quota / (1024 * 1024 * 1024)).toFixed(quota >= 1024 * 1024 * 1024 ? 0 : 1);
    throw new AppError(
      `Armazenamento do plano esgotado (limite de ${quotaGb} GB). Remova arquivos ou faça upgrade para enviar mais.`,
      413,
    );
  }
}

export async function assertClientCapacity(userId: number, role?: "user" | "admin") {
  if (role === "admin") return;
  await requireOperationalAccess(userId, role);
  const allowance = await getClientAllowance(userId);
  if (!allowance.canCreate) {
    throw new AppError(
      `Seu plano ${allowance.planId.toUpperCase()} permite até ${allowance.limit} clientes. Faça upgrade para continuar.`,
      402,
    );
  }
}

const FEATURE_REQUIREMENTS: Record<FeatureFlagId, { label: string; planLabel: string }> = {
  budgetTracking: { label: "Orçamento", planLabel: "Studio" },
  projectDre: { label: "DRE por Projeto", planLabel: "Studio" },
  equipmentInventory: { label: "Equipamento", planLabel: "Studio" },
  shotList: { label: "Shot List", planLabel: "Pro" },
  timesheet: { label: "Timesheet", planLabel: "Pro" },
  customBranding: { label: "Marca personalizada", planLabel: "White Label" },
  pipeline: { label: "Pipeline comercial", planLabel: "Pro" },
  videoReviews: { label: "Review de vídeos", planLabel: "Pro" },
  proposals: { label: "Propostas", planLabel: "Pro" },
  webhooks: { label: "Webhooks", planLabel: "Studio" },
  calendarExport: { label: "Exportar cronograma para agenda", planLabel: "Studio" },
};

/**
 * Gate a feature behind the caller's plan entitlements. Admins always bypass.
 * Throws AppError(402) with an upgrade message when the plan doesn't include it.
 */
export async function requireFeature(userId: number, role: "user" | "admin" | undefined, feature: FeatureFlagId) {
  if (role === "admin") return;
  const entitlement = await getUserEntitlements(userId);
  const { label, planLabel } = FEATURE_REQUIREMENTS[feature];
  if (!entitlement.operational || !entitlement[feature]) {
    throw new AppError(`Ative o plano ${planLabel} para liberar ${label}.`, 402);
  }
}
