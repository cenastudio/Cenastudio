export type OperationalPlanId = "free" | "pro" | "studio";

// Feature identifiers for feature gating
export type ProductFeatureId = string;

/**
 * Feature flags gated by plan tier. Keys match `FeatureFlagId` below and are
 * consumed by `entitlementService.requireFeature()` (backend) and mirrored in
 * `client/src/lib/feature-gating/gate.ts` (frontend) so a blocked feature is
 * always hidden on the client AND rejected (402) on the server.
 */
export type FeatureFlagId = "budgetTracking" | "equipmentInventory" | "shotList" | "timesheet";

export interface PlanEntitlement {
  clientLimit: number | null;
  teamMemberLimit: number;
  requiresPaidActivation: boolean;
  budgetTracking: boolean;
  equipmentInventory: boolean;
  shotList: boolean;
  timesheet: boolean;
}

export const PLAN_ENTITLEMENTS: Record<OperationalPlanId, PlanEntitlement> = {
  free: {
    clientLimit: 5,
    teamMemberLimit: 0,
    requiresPaidActivation: false,
    budgetTracking: false,
    equipmentInventory: false,
    shotList: false,
    timesheet: false,
  },
  pro: {
    clientLimit: 15,
    teamMemberLimit: 0,
    requiresPaidActivation: false,
    budgetTracking: false,
    equipmentInventory: false,
    shotList: true,
    timesheet: true,
  },
  studio: {
    clientLimit: 50,
    teamMemberLimit: 5,
    requiresPaidActivation: true,
    budgetTracking: true,
    equipmentInventory: true,
    shotList: true,
    timesheet: true,
  },
};

export function normalizeOperationalPlan(planId: string | null | undefined): OperationalPlanId {
  if (planId === "studio" || planId === "produtora") return "studio";
  if (planId === "pro" || planId === "profissional") return "pro";
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
