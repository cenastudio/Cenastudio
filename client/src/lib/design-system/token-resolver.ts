/**
 * Token Resolution Utility
 *
 * Helper functions to resolve plan tokens with fallback chain:
 * 1. Plan-specific token (--plan-*)
 * 2. Global design token (--ds-*)
 * 3. Hardcoded fallback value
 *
 * This utility is primarily for JavaScript/TypeScript logic that needs to read
 * CSS custom property values. For CSS-only usage, the fallback chain is handled
 * automatically via var(--plan-token, var(--ds-token, fallback)).
 *
 * Fase 3 (white label): fallbacks de cor primária derivam de
 * `SITE_CONFIG.primaryColor` — env `APP_PRIMARY_COLOR`.
 */

import { SITE_CONFIG } from "@shared/site";

/**
 * Resolve a plan token from the document root
 *
 * Attempts to read a CSS custom property with the following fallback chain:
 * 1. Plan-specific token (--plan-{tokenName})
 * 2. Global design token (--ds-{tokenName})
 * 3. Provided fallback value
 *
 * @param tokenName - Token name without prefix (e.g., "accent-primary")
 * @param fallback - Fallback value if token is not found (optional)
 * @returns Resolved token value or fallback
 *
 * @example
 * ```typescript
 * // Resolve accent color with fallback
 * const accentColor = resolvePlanToken('accent-primary', '#e85002');
 * // Returns: value of --plan-accent-primary, or --ds-orange, or '#e85002'
 *
 * // Resolve shadow token
 * const cardShadow = resolvePlanToken('shadow-card', 'none');
 * ```
 */
export function resolvePlanToken(
  tokenName: string,
  fallback?: string
): string {
  const rootStyles = getComputedStyle(document.documentElement);

  // Try plan-specific token first
  const planToken = `--plan-${tokenName}`;
  const planValue = rootStyles.getPropertyValue(planToken).trim();
  if (planValue) {
    return planValue;
  }

  // Try global design token second
  const dsToken = `--ds-${tokenName}`;
  const dsValue = rootStyles.getPropertyValue(dsToken).trim();
  if (dsValue) {
    return dsValue;
  }

  // Return fallback or empty string
  return fallback || '';
}

/**
 * Resolve multiple plan tokens at once
 *
 * Useful for resolving a batch of tokens efficiently.
 *
 * @param tokens - Record of token names to fallback values
 * @returns Record of resolved token values
 *
 * @example
 * ```typescript
 * const tokens = resolvePlanTokens({
 *   'accent-primary': '#e85002',
 *   'surface-elevated': '#101010',
 *   'shadow-card': 'none',
 * });
 *
 * console.log(tokens['accent-primary']); // Resolved value
 * ```
 */
export function resolvePlanTokens(
  tokens: Record<string, string>
): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const [tokenName, fallback] of Object.entries(tokens)) {
    resolved[tokenName] = resolvePlanToken(tokenName, fallback);
  }

  return resolved;
}

/**
 * Check if a plan token is defined
 *
 * Useful for conditional logic based on token availability.
 *
 * @param tokenName - Token name without prefix
 * @returns True if plan token is defined, false otherwise
 *
 * @example
 * ```typescript
 * if (hasPlanToken('glow-card')) {
 *   // Pro or Studio plan - apply glow effect
 * } else {
 *   // Free plan - no glow effect
 * }
 * ```
 */
export function hasPlanToken(tokenName: string): boolean {
  const rootStyles = getComputedStyle(document.documentElement);
  const planToken = `--plan-${tokenName}`;
  const planValue = rootStyles.getPropertyValue(planToken).trim();
  return Boolean(planValue);
}

/**
 * Get the current plan mode from data-plan attribute
 *
 * Reads the data-plan attribute set by PlanTokenProvider.
 *
 * @returns Current plan mode or null if not set
 *
 * @example
 * ```typescript
 * const planMode = getCurrentPlanMode();
 * if (planMode === 'studio') {
 *   // Apply studio-specific logic
 * }
 * ```
 */
export function getCurrentPlanMode(): string | null {
  return document.documentElement.getAttribute('data-plan');
}

/**
 * Check if current plan has glow effects
 *
 * Glow effects are available in Pro and Studio plans.
 *
 * @returns True if glow effects are available
 */
export function hasGlowEffects(): boolean {
  const planMode = getCurrentPlanMode();
  return planMode === 'pro' || planMode === 'studio' || planMode === 'admin';
}

/**
 * Check if current plan has dual-accent system
 *
 * Dual-accent (orange + gold) is available in Studio plan only.
 *
 * @returns True if dual-accent system is available
 */
export function hasDualAccent(): boolean {
  const planMode = getCurrentPlanMode();
  return planMode === 'studio' || planMode === 'studio-pending' || planMode === 'admin';
}

/**
 * Resolve typography scale multiplier
 *
 * Returns the plan-specific typography scale multiplier:
 * - Free: 1.0
 * - Pro: 1.06
 * - Studio: 1.08
 *
 * @returns Typography scale multiplier
 *
 * @example
 * ```typescript
 * const scale = getTypographyScale();
 * const fontSize = 16 * scale; // Scaled font size
 * ```
 */
export function getTypographyScale(): number {
  const scale = resolvePlanToken('typography-scale', '1.0');
  return parseFloat(scale) || 1.0;
}

/**
 * Resolve contextual accent color
 *
 * Returns the appropriate accent color based on context:
 * - 'financial' context in Studio plan: gold (#D8B343)
 * - All other contexts: orange (#E85002)
 *
 * @param context - Context type ('primary' | 'financial')
 * @returns Resolved accent color
 *
 * @example
 * ```typescript
 * // In a financial module (Studio plan)
 * const accentColor = getContextualAccent('financial');
 * // Returns: '#D8B343' (gold)
 *
 * // In a creative module
 * const accentColor = getContextualAccent('primary');
 * // Returns: '#e85002' (orange)
 * ```
 */
export function getContextualAccent(context: 'primary' | 'financial' = 'primary'): string {
  if (context === 'financial' && hasDualAccent()) {
    return resolvePlanToken('accent-financial', '#d8b343');
  }
  return resolvePlanToken('accent-primary', SITE_CONFIG.primaryColor);
}
