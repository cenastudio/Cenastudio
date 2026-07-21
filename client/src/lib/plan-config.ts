/**
 * Plan Configuration
 *
 * Central configuration for all plan tiers.
 * Defines metadata, features, and navigation for each plan.
 *
 * Fase 3 (white label): `accentColor` de cada plano deriva de
 * `SITE_CONFIG.primaryColor` — env `APP_PRIMARY_COLOR` — para que
 * o rebrand troque a cor em toda a UI sem editar código.
 */

import type { PlanMode, PlanMetadata, VisualIdentity, NavItem } from "@/types/plan";
import { SITE_CONFIG } from "@shared/site";

const BRAND_ACCENT = SITE_CONFIG.primaryColor;

/**
 * Plan hierarchy for access comparison
 */
export const PLAN_HIERARCHY: Record<PlanMode, number> = {
  brand: 0,
  free: 1,
  pro: 2,
  studio: 3,
  "studio-pending": 3,
  whitelabel: 4,
  enterprise: 5,
  admin: 6,
};

/**
 * Plan metadata configuration
 */
const PLAN_METADATA: Record<PlanMode, PlanMetadata> = {
  brand: {
    id: "brand",
    displayName: "Brand",
    visualIdentity: "minimal" as VisualIdentity,
    accentColor: BRAND_ACCENT,
    featureCount: 0,
    maxTeamMembers: 0,
    workflowSteps: [],
    navStructure: [],
    supportsCommercialHub: false,
    supportsFinancialModules: false,
    supportsPipeline: false,
    supportsVideoReviews: false,
    supportsCustomBranding: false,
    supportsAPI: false,
  },

  free: {
    id: "free",
    displayName: "Free",
    visualIdentity: "minimal" as VisualIdentity,
    accentColor: BRAND_ACCENT,
    featureCount: 8,
    maxProjects: 5,
    maxTeamMembers: 0,
    workflowSteps: ["entry", "planning", "production", "delivery"],
    navStructure: [],
    supportsCommercialHub: false,
    supportsFinancialModules: false,
    supportsPipeline: false,
    supportsVideoReviews: false,
    supportsCustomBranding: false,
    supportsAPI: false,
  },

  pro: {
    id: "pro",
    displayName: "Pro",
    visualIdentity: "cockpit" as VisualIdentity,
    accentColor: BRAND_ACCENT,
    featureCount: 12,
    maxProjects: 50,
    maxTeamMembers: 5,
    workflowSteps: ["entry", "planning", "production", "revision", "delivery", "closure"],
    navStructure: [],
    supportsCommercialHub: false,
    supportsFinancialModules: false,
    supportsPipeline: true,
    supportsVideoReviews: true,
    supportsCustomBranding: false,
    supportsAPI: false,
  },

  studio: {
    id: "studio",
    displayName: "Studio",
    visualIdentity: "command-center" as VisualIdentity,
    accentColor: BRAND_ACCENT,
    featureCount: -1, // unlimited
    maxTeamMembers: -1, // unlimited
    workflowSteps: ["entry", "planning", "production", "revision", "delivery", "closure"],
    navStructure: [],
    supportsCommercialHub: true,
    supportsFinancialModules: true,
    supportsPipeline: true,
    supportsVideoReviews: true,
    // Custom branding is a White Label+ entitlement (see shared/planEntitlements.ts
    // customBranding: false for studio) — must stay false here too.
    supportsCustomBranding: false,
    supportsAPI: true,
  },

  "studio-pending": {
    id: "studio-pending",
    displayName: "Studio (Pending)",
    visualIdentity: "command-center" as VisualIdentity,
    accentColor: BRAND_ACCENT,
    featureCount: -1,
    maxTeamMembers: -1,
    workflowSteps: ["entry", "planning", "production", "revision", "delivery", "closure"],
    navStructure: [],
    supportsCommercialHub: true,
    supportsFinancialModules: true,
    supportsPipeline: true,
    supportsVideoReviews: true,
    supportsCustomBranding: false,
    supportsAPI: true,
  },

  whitelabel: {
    id: "whitelabel",
    displayName: "White Label",
    visualIdentity: "command-center" as VisualIdentity,
    accentColor: BRAND_ACCENT,
    featureCount: -1,
    maxTeamMembers: -1,
    workflowSteps: ["entry", "planning", "production", "revision", "delivery", "closure"],
    navStructure: [],
    supportsCommercialHub: true,
    supportsFinancialModules: true,
    supportsPipeline: true,
    supportsVideoReviews: true,
    supportsCustomBranding: true,
    supportsAPI: true,
  },

  enterprise: {
    id: "enterprise",
    displayName: "Enterprise",
    visualIdentity: "command-center" as VisualIdentity,
    accentColor: BRAND_ACCENT,
    featureCount: -1,
    maxTeamMembers: -1,
    workflowSteps: ["entry", "planning", "production", "revision", "delivery", "closure"],
    navStructure: [],
    supportsCommercialHub: true,
    supportsFinancialModules: true,
    supportsPipeline: true,
    supportsVideoReviews: true,
    supportsCustomBranding: true,
    supportsAPI: true,
  },

  admin: {
    id: "admin",
    displayName: "Admin",
    visualIdentity: "command-center" as VisualIdentity,
    accentColor: BRAND_ACCENT,
    featureCount: -1,
    maxTeamMembers: -1,
    workflowSteps: ["entry", "planning", "production", "revision", "delivery", "closure"],
    navStructure: [],
    supportsCommercialHub: true,
    supportsFinancialModules: true,
    supportsPipeline: true,
    supportsVideoReviews: true,
    supportsCustomBranding: true,
    supportsAPI: true,
  },
};

/**
 * Get metadata for a specific plan
 *
 * @param planMode - Plan mode to get metadata for
 * @returns Plan metadata
 */
export function getPlanMetadata(planMode: PlanMode): PlanMetadata {
  return PLAN_METADATA[planMode];
}

/**
 * Check if a plan has access to another plan's features
 *
 * @param userPlan - User's current plan
 * @param requiredPlan - Required plan level
 * @returns True if user plan meets or exceeds required plan
 */
export function hasPlanAccess(userPlan: PlanMode, requiredPlan: PlanMode): boolean {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
}

/**
 * Get the next plan upgrade from current plan
 *
 * @param currentPlan - Current plan mode
 * @returns Next plan in hierarchy or undefined if already at top
 */
export function getNextPlan(currentPlan: PlanMode): PlanMode | undefined {
  const hierarchy: PlanMode[] = ["free", "pro", "studio"];
  const currentIndex = hierarchy.indexOf(currentPlan);

  if (currentIndex === -1 || currentIndex === hierarchy.length - 1) {
    return undefined;
  }

  return hierarchy[currentIndex + 1];
}

/**
 * Get plan display name with formatting
 *
 * @param planMode - Plan mode
 * @returns Formatted display name
 */
export function getPlanDisplayName(planMode: PlanMode): string {
  const metadata = getPlanMetadata(planMode);
  return metadata.displayName;
}

/**
 * Check if plan is pending payment
 *
 * @param planMode - Plan mode
 * @returns True if plan is pending
 */
export function isPlanPending(planMode: PlanMode): boolean {
  return planMode === "studio-pending";
}

/**
 * Check if plan is premium (Pro or Studio)
 *
 * @param planMode - Plan mode
 * @returns True if premium plan
 */
export function isPremiumPlan(planMode: PlanMode): boolean {
  return planMode === "pro" || planMode === "studio" || planMode === "studio-pending" || planMode === "admin";
}
