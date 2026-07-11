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
  equipmentInventory: { label: "Equipamento", planLabel: "Studio" },
  shotList: { label: "Shot List", planLabel: "Pro" },
  timesheet: { label: "Timesheet", planLabel: "Pro" },
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
