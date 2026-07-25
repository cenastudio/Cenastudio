/**
 * Feature Gating Utility
 *
 * Server-side and client-side feature access validation based on plan tier.
 * Ensures users can only access features their plan permits.
 *
 * Features:
 * - Type-safe feature checking
 * - Clear error messages
 * - Plan requirement mapping
 * - Server and client validation
 *
 * @example
 * ```typescript
 * // Check feature access
 * const result = canAccessFeature('pipeline', 'free');
 * if (!result.hasAccess) {
 *   console.log(result.reason); // "Pipeline requires Pro plan or higher"
 * }
 *
 * // Get required plan for feature
 * const requiredPlan = getRequiredPlan('commercial-hub');
 * // Returns: "studio"
 * ```
 */

import type { PlanMode, FeatureName, FeatureAccessResult } from "@/types/plan";

/**
 * Feature Requirements Map
 *
 * Defines which plan is required for each feature.
 * Features not listed are available to all authenticated users.
 */
const FEATURE_REQUIREMENTS: Partial<Record<FeatureName, PlanMode>> = {
  // Pro Features
  "pipeline": "pro",
  "video-reviews": "pro",
  "collaboration": "pro",
  "advanced-export": "pro",

  // Studio Features
  "commercial-hub": "studio",
  "proposals": "studio",
  "contracts": "studio",
  "financial-module": "studio",
  "team-management": "studio",
  "analytics": "studio",
  "api": "studio",
  "priority-support": "studio",

  // Landing features implementation (spec: landing-features-implementation)
  // Mirrors shared/planEntitlements.ts — must stay in sync with the backend gate.
  "budget-tracking": "studio",
  "project-dre": "studio",
  "equipment-inventory": "studio",
  "shot-list": "pro",
  "timesheet": "pro",
  "webhooks": "studio",
  "calendar-export": "studio",

  // Whitelabel Features
  "custom-branding": "whitelabel",
};

/**
 * Plan Hierarchy
 *
 * Defines the upgrade path and privilege ordering.
 * Higher index = more privileges.
 */
const PLAN_HIERARCHY: PlanMode[] = [
  "brand",           // 0 - Unauthenticated
  "free",            // 1 - Free tier
  "pro",             // 2 - Pro tier
  "studio-pending",  // 3 - Studio pending (Pro privileges)
  "studio",          // 4 - Studio tier
  "whitelabel",      // 5 - Whitelabel tier
  "enterprise",      // 6 - Enterprise tier
  "admin",           // 7 - Admin (full access)
];

/**
 * Get plan hierarchy level
 *
 * @param planMode - Plan mode to check
 * @returns Hierarchy level (higher = more privileges)
 */
function getPlanLevel(planMode: PlanMode): number {
  const level = PLAN_HIERARCHY.indexOf(planMode);
  return level === -1 ? 0 : level;
}

/**
 * Check if user can access a feature
 *
 * Validates feature access based on the user's plan tier.
 * Returns detailed result with access status and reason.
 *
 * @param feature - Feature to check access for
 * @param userPlan - User's current plan mode
 * @returns Feature access result with hasAccess flag and details
 *
 * @example
 * ```typescript
 * // Free user trying to access pipeline
 * const result = canAccessFeature('pipeline', 'free');
 * // { hasAccess: false, requiredPlan: 'pro', reason: '...' }
 *
 * // Pro user accessing pipeline
 * const result = canAccessFeature('pipeline', 'pro');
 * // { hasAccess: true }
 *
 * // Admin always has access
 * const result = canAccessFeature('financial-module', 'admin');
 * // { hasAccess: true }
 * ```
 */
export function canAccessFeature(
  feature: FeatureName,
  userPlan: PlanMode
): FeatureAccessResult {
  // Admin always has access
  if (userPlan === "admin") {
    return { hasAccess: true };
  }

  // Brand (unauthenticated) users have no access to features
  if (userPlan === "brand") {
    return {
      hasAccess: false,
      requiredPlan: "free",
      reason: "Please sign in to access this feature",
    };
  }

  // Check if feature has a requirement
  const requiredPlan = FEATURE_REQUIREMENTS[feature];

  // If no requirement, feature is available to all authenticated users
  if (!requiredPlan) {
    return { hasAccess: true };
  }

  // Check if user's plan meets requirement
  const userLevel = getPlanLevel(userPlan);
  const requiredLevel = getPlanLevel(requiredPlan);

  if (userLevel >= requiredLevel) {
    return { hasAccess: true };
  }

  // Access denied
  const featureLabel = feature
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  const planLabel = requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1);

  return {
    hasAccess: false,
    requiredPlan,
    reason: `${featureLabel} requires ${planLabel} plan or higher`,
  };
}

/**
 * Get required plan for a feature
 *
 * @param feature - Feature to check
 * @returns Required plan mode, or null if available to all
 *
 * @example
 * ```typescript
 * getRequiredPlan('pipeline');        // "pro"
 * getRequiredPlan('commercial-hub');  // "studio"
 * getRequiredPlan('projects');        // null (available to all)
 * ```
 */
export function getRequiredPlan(feature: FeatureName): PlanMode | null {
  return FEATURE_REQUIREMENTS[feature] || null;
}

/**
 * Check if plan has access to all features in a list
 *
 * @param features - Array of features to check
 * @param userPlan - User's current plan mode
 * @returns True if user has access to all features
 *
 * @example
 * ```typescript
 * const proFeatures: FeatureName[] = ['pipeline', 'video-reviews'];
 * hasAccessToAll(proFeatures, 'pro');    // true
 * hasAccessToAll(proFeatures, 'free');   // false
 * ```
 */
export function hasAccessToAll(
  features: FeatureName[],
  userPlan: PlanMode
): boolean {
  return features.every((feature) => canAccessFeature(feature, userPlan).hasAccess);
}

/**
 * Check if plan has access to any feature in a list
 *
 * @param features - Array of features to check
 * @param userPlan - User's current plan mode
 * @returns True if user has access to at least one feature
 *
 * @example
 * ```typescript
 * const premiumFeatures: FeatureName[] = ['pipeline', 'commercial-hub'];
 * hasAccessToAny(premiumFeatures, 'pro');  // true (has pipeline)
 * hasAccessToAny(premiumFeatures, 'free'); // false (has none)
 * ```
 */
export function hasAccessToAny(
  features: FeatureName[],
  userPlan: PlanMode
): boolean {
  return features.some((feature) => canAccessFeature(feature, userPlan).hasAccess);
}

/**
 * Get all accessible features for a plan
 *
 * @param userPlan - User's current plan mode
 * @returns Array of accessible feature names
 *
 * @example
 * ```typescript
 * const freeFeatures = getAccessibleFeatures('free');
 * // ['projects', 'clients', 'tools']
 *
 * const studioFeatures = getAccessibleFeatures('studio');
 * // All features
 * ```
 */
export function getAccessibleFeatures(userPlan: PlanMode): FeatureName[] {
  const allFeatures = Object.keys(FEATURE_REQUIREMENTS) as FeatureName[];

  return allFeatures.filter((feature) => {
    const result = canAccessFeature(feature, userPlan);
    return result.hasAccess;
  });
}

/**
 * Get all locked features for a plan
 *
 * @param userPlan - User's current plan mode
 * @returns Array of locked feature names with required plans
 *
 * @example
 * ```typescript
 * const lockedFeatures = getLockedFeatures('free');
 * // [
 * //   { feature: 'pipeline', requiredPlan: 'pro' },
 * //   { feature: 'commercial-hub', requiredPlan: 'studio' },
 * //   ...
 * // ]
 * ```
 */
export function getLockedFeatures(
  userPlan: PlanMode
): Array<{ feature: FeatureName; requiredPlan: PlanMode }> {
  const allFeatures = Object.keys(FEATURE_REQUIREMENTS) as FeatureName[];

  return allFeatures
    .filter((feature) => {
      const result = canAccessFeature(feature, userPlan);
      return !result.hasAccess;
    })
    .map((feature) => ({
      feature,
      requiredPlan: FEATURE_REQUIREMENTS[feature]!,
    }));
}

/**
 * Check if a plan is higher than another
 *
 * @param planA - First plan to compare
 * @param planB - Second plan to compare
 * @returns True if planA has higher privileges than planB
 *
 * @example
 * ```typescript
 * isPlanHigherThan('pro', 'free');      // true
 * isPlanHigherThan('free', 'pro');      // false
 * isPlanHigherThan('studio', 'pro');    // true
 * isPlanHigherThan('admin', 'studio');  // true
 * ```
 */
export function isPlanHigherThan(planA: PlanMode, planB: PlanMode): boolean {
  return getPlanLevel(planA) > getPlanLevel(planB);
}

/**
 * Get next plan in hierarchy
 *
 * @param currentPlan - Current plan mode
 * @returns Next plan in hierarchy, or null if at highest tier
 *
 * @example
 * ```typescript
 * getNextPlan('free');    // 'pro'
 * getNextPlan('pro');     // 'studio'
 * getNextPlan('studio');  // null (at highest)
 * getNextPlan('admin');   // null
 * ```
 */
export function getNextPlan(currentPlan: PlanMode): PlanMode | null {
  const currentLevel = getPlanLevel(currentPlan);
  const nextLevel = currentLevel + 1;

  // Skip studio-pending in upgrade path
  if (PLAN_HIERARCHY[nextLevel] === "studio-pending") {
    return PLAN_HIERARCHY[nextLevel + 1] || null;
  }

  // Skip admin in upgrade path (not a public tier)
  if (PLAN_HIERARCHY[nextLevel] === "admin") {
    return null;
  }

  return PLAN_HIERARCHY[nextLevel] || null;
}
