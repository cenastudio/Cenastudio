export type OperationalPlanId = "free" | "pro" | "studio" | "whitelabel" | "enterprise";

// Feature identifiers for feature gating
export type ProductFeatureId = string;

/**
 * Feature flags gated by plan tier. Keys match `FeatureFlagId` below and are
 * consumed by `entitlementService.requireFeature()` (backend) and mirrored in
 * `client/src/lib/feature-gating/gate.ts` (frontend) so a blocked feature is
 * always hidden on the client AND rejected (402) on the server.
 */
export type FeatureFlagId = "budgetTracking" | "equipmentInventory" | "shotList" | "timesheet" | "customBranding";

export interface PlanEntitlement {
  clientLimit: number | null;
  teamMemberLimit: number; // -1 = unlimited, 0 = feature unavailable
  requiresPaidActivation: boolean;
  budgetTracking: boolean;
  equipmentInventory: boolean;
  shotList: boolean;
  shotListLimit: number; // -1 = unlimited
  timesheet: boolean;
  customBranding: boolean;
}

export const PLAN_ENTITLEMENTS: Record<OperationalPlanId, PlanEntitlement> = {
  free: {
    clientLimit: 5,
    teamMemberLimit: 0,
    requiresPaidActivation: false,
    budgetTracking: false,
    equipmentInventory: false,
    shotList: false,
    shotListLimit: 20,
    timesheet: false,
    customBranding: false,
  },
  pro: {
    clientLimit: 15,
    teamMemberLimit: 5,
    requiresPaidActivation: false,
    budgetTracking: false,
    equipmentInventory: false,
    shotList: true,
    shotListLimit: 100,
    timesheet: true,
    customBranding: false,
  },
  studio: {
    clientLimit: 50,
    teamMemberLimit: -1, // unlimited — matches advertised "Equipe ilimitada"
    requiresPaidActivation: true,
    budgetTracking: true,
    equipmentInventory: true,
    shotList: true,
    shotListLimit: -1, // unlimited
    timesheet: true,
    customBranding: false,
  },
  whitelabel: {
    clientLimit: null, // unlimited — matches advertised "Clientes ilimitados"
    teamMemberLimit: 10,
    requiresPaidActivation: true,
    budgetTracking: true,
    equipmentInventory: true,
    shotList: true,
    shotListLimit: -1, // unlimited
    timesheet: true,
    customBranding: true,
  },
  enterprise: {
    clientLimit: null,
    teamMemberLimit: -1, // unlimited — matches advertised "Usuários ilimitados"
    requiresPaidActivation: true,
    budgetTracking: true,
    equipmentInventory: true,
    shotList: true,
    shotListLimit: -1, // unlimited
    timesheet: true,
    customBranding: true,
  },
};

export function normalizeOperationalPlan(planId: string | null | undefined): OperationalPlanId {
  if (planId === "studio" || planId === "produtora") return "studio";
  if (planId === "pro" || planId === "profissional") return "pro";
  if (planId === "whitelabel") return "whitelabel";
  if (planId === "enterprise") return "enterprise";
  return "free";
}

export function getPlanEntitlement(planId: string | null | undefined) {
  const normalizedPlanId = normalizeOperationalPlan(planId);
  return { planId: normalizedPlanId, ...PLAN_ENTITLEMENTS[normalizedPlanId] };
}

export function isPlanOperational(planId: string | null | undefined, status: string | null | undefined) {
  const entitlement = getPlanEntitlement(planId);
  if (entitlement.requiresPaidActivation) return status === "active";
  return status === "active" || status === "trial";
}
