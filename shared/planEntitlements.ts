export type OperationalPlanId = "free" | "pro" | "studio";

// Feature identifiers for feature gating
export type ProductFeatureId = string;

export interface PlanEntitlement {
  clientLimit: number | null;
  teamMemberLimit: number;
  requiresPaidActivation: boolean;
}

export const PLAN_ENTITLEMENTS: Record<OperationalPlanId, PlanEntitlement> = {
  free: { clientLimit: 5, teamMemberLimit: 0, requiresPaidActivation: false },
  pro: { clientLimit: 15, teamMemberLimit: 0, requiresPaidActivation: false },
  studio: { clientLimit: 50, teamMemberLimit: 5, requiresPaidActivation: true },
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
