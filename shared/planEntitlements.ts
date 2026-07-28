export type OperationalPlanId = "free" | "pro" | "studio" | "whitelabel" | "enterprise";

// Feature identifiers for feature gating
export type ProductFeatureId = string;

/**
 * Feature flags gated by plan tier. Keys match `FeatureFlagId` below and are
 * consumed by `entitlementService.requireFeature()` (backend) and mirrored in
 * `client/src/lib/feature-gating/gate.ts` (frontend) so a blocked feature is
 * always hidden on the client AND rejected (402) on the server.
 */
export type FeatureFlagId =
  | "budgetTracking"
  | "projectDre"
  | "equipmentInventory"
  | "shotList"
  | "timesheet"
  | "customBranding"
  | "pipeline"
  | "videoReviews"
  | "proposals"
  | "webhooks"
  | "calendarExport";

const GB = 1024 * 1024 * 1024;

export interface PlanEntitlement {
  clientLimit: number | null;
  // "Portal do cliente com login persistente" — disponível em todos os
  // planos, diferenciado pelo número de clientes com portal ativo
  // simultaneamente. Mesma convenção de clientLimit: number | null, null = ilimitado.
  clientPortalLimit: number | null;
  teamMemberLimit: number; // -1 = unlimited, 0 = feature unavailable
  storageLimitBytes: number; // -1 = unlimited
  requiresPaidActivation: boolean;
  budgetTracking: boolean;
  // "DRE por projeto" — resultado financeiro real do projeto (receita menos
  // custos/despesas). Depende de budgetTracking para custos diretos, então
  // segue o mesmo nível mínimo de plano (Studio+).
  projectDre: boolean;
  equipmentInventory: boolean;
  shotList: boolean;
  shotListLimit: number; // -1 = unlimited
  timesheet: boolean;
  customBranding: boolean;
  // "CRM completo + pipeline comercial" — opportunities pipeline + interaction
  // history/follow-ups, advertised as a Pro+ feature (Free only gets the
  // basic client list, per shared/site.ts PRICING).
  pipeline: boolean;
  // "Review de vídeos com anotações" — advertised Pro+.
  videoReviews: boolean;
  // "Portal do cliente com aprovações" — advertised Pro+.
  proposals: boolean;
  // "Webhooks para automação" — advertised Studio+.
  webhooks: boolean;
  // "Exportar cronograma para agenda (.ics)" — advertised Studio+.
  calendarExport: boolean;
}

export const PLAN_ENTITLEMENTS: Record<OperationalPlanId, PlanEntitlement> = {
  free: {
    clientLimit: 5,
    clientPortalLimit: 1,
    teamMemberLimit: 0,
    storageLimitBytes: 2 * GB,
    requiresPaidActivation: false,
    budgetTracking: false,
    projectDre: false,
    equipmentInventory: false,
    shotList: false,
    shotListLimit: 20,
    timesheet: false,
    customBranding: false,
    pipeline: false,
    videoReviews: false,
    proposals: false,
    webhooks: false,
    calendarExport: false,
  },
  pro: {
    clientLimit: 15,
    clientPortalLimit: 5,
    teamMemberLimit: 5,
    storageLimitBytes: 25 * GB,
    requiresPaidActivation: false,
    budgetTracking: false,
    projectDre: false,
    equipmentInventory: false,
    shotList: true,
    shotListLimit: 100,
    timesheet: true,
    customBranding: false,
    pipeline: true,
    videoReviews: true,
    proposals: true,
    webhooks: false,
    calendarExport: false,
  },
  studio: {
    clientLimit: 50,
    clientPortalLimit: null, // unlimited
    teamMemberLimit: -1, // unlimited — matches advertised "Equipe ilimitada"
    storageLimitBytes: 250 * GB,
    requiresPaidActivation: true,
    budgetTracking: true,
    projectDre: true,
    equipmentInventory: true,
    shotList: true,
    shotListLimit: -1, // unlimited
    timesheet: true,
    customBranding: false,
    pipeline: true,
    videoReviews: true,
    proposals: true,
    webhooks: true,
    calendarExport: true,
  },
  whitelabel: {
    clientLimit: null, // unlimited — matches advertised "Clientes ilimitados"
    clientPortalLimit: null, // unlimited
    teamMemberLimit: 10,
    storageLimitBytes: 1024 * GB, // 1 TB
    requiresPaidActivation: true,
    budgetTracking: true,
    projectDre: true,
    equipmentInventory: true,
    shotList: true,
    shotListLimit: -1, // unlimited
    timesheet: true,
    customBranding: true,
    pipeline: true,
    videoReviews: true,
    proposals: true,
    webhooks: true,
    calendarExport: true,
  },
  enterprise: {
    clientLimit: null,
    clientPortalLimit: null, // unlimited
    teamMemberLimit: -1, // unlimited — matches advertised "Usuários ilimitados"
    storageLimitBytes: -1, // unlimited
    requiresPaidActivation: true,
    budgetTracking: true,
    projectDre: true,
    equipmentInventory: true,
    shotList: true,
    shotListLimit: -1, // unlimited
    timesheet: true,
    customBranding: true,
    pipeline: true,
    videoReviews: true,
    proposals: true,
    webhooks: true,
    calendarExport: true,
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
