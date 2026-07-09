/**
 * Apply Plan Tokens
 *
 * Applies CSS custom properties to document root based on plan mode.
 * Dynamically switches design tokens when plan changes.
 */

import type { PlanMode } from "@/types/plan";

/**
 * CSS Token definitions for each plan
 */
// Shared glow presets, kept in lowercase-hex box-shadow format so they're
// consistent regardless of plan. Small/medium/large map to the increasing
// blur radii already used across plan-tokens/*.css (glow-button, glow-card).
const GLOW_SM = "0 0 12px rgba(232, 80, 2, 0.25)";
const GLOW_MD = "0 0 24px rgba(232, 80, 2, 0.3)";
const GLOW_LG = "0 0 40px rgba(232, 80, 2, 0.35)";

const PLAN_TOKENS = {
  brand: {
    // Brand mode (unauthenticated) - minimal branding, no glow/financial accent
    "--plan-accent-primary": "#e85002",
    "--plan-text-primary": "#F9F9F9",
    "--plan-text-secondary": "#A0A0A0",
    "--plan-surface-base": "#0A0A0A",
    "--plan-surface-elevated": "#121212",
    "--plan-typography-scale": "1.0",
  },

  free: {
    // Free plan - clean minimal design (see plan-tokens/free.css: no glow, no financial accent)
    "--plan-accent-primary": "#e85002",
    "--plan-text-primary": "#F9F9F9",
    "--plan-text-secondary": "#A0A0A0",
    "--plan-text-tertiary": "#6B6B6B",
    "--plan-surface-base": "#0A0A0A",
    "--plan-surface-elevated": "#121212",
    "--plan-surface-overlay": "#1A1A1A",
    "--plan-border-subtle": "rgba(255, 255, 255, 0.06)",
    "--plan-border-default": "rgba(255, 255, 255, 0.12)",
    "--plan-shadow-card": "0 1px 3px rgba(0, 0, 0, 0.3)",
    "--plan-typography-scale": "1.0",
  },

  pro: {
    // Pro plan - enhanced with glow effects, but no financial (gold) accent
    // (see plan-tokens/pro.css: "Pro plan does not have secondary accent")
    "--plan-accent-primary": "#e85002",
    "--plan-text-primary": "#F9F9F9",
    "--plan-text-secondary": "#A0A0A0",
    "--plan-text-tertiary": "#6B6B6B",
    "--plan-surface-base": "#0A0A0A",
    "--plan-surface-elevated": "#121212",
    "--plan-surface-overlay": "#1A1A1A",
    "--plan-border-subtle": "rgba(255, 255, 255, 0.06)",
    "--plan-border-default": "rgba(255, 255, 255, 0.12)",
    "--plan-border-orange": "rgba(232, 80, 2, 0.3)",
    "--plan-shadow-card": "0 2px 8px rgba(0, 0, 0, 0.4)",
    "--plan-shadow-card-hover": "0 4px 16px rgba(232, 80, 2, 0.15)",
    "--plan-glow-primary": "0 0 20px rgba(232, 80, 2, 0.3)",
    "--plan-glow-card": "0 0 40px rgba(232, 80, 2, 0.1)",
    "--plan-glow-sm": GLOW_SM,
    "--plan-glow-md": GLOW_MD,
    "--plan-glow-lg": GLOW_LG,
    "--plan-typography-scale": "1.06",
  },

  studio: {
    // Studio plan - premium dual-accent system: orange (creative) + gold
    // (financial), per plan-tokens/studio.css.
    "--plan-accent-primary": "#e85002",
    "--plan-accent-financial": "#d8b343",
    "--plan-text-primary": "#F9F9F9",
    "--plan-text-secondary": "#A0A0A0",
    "--plan-text-tertiary": "#6B6B6B",
    "--plan-surface-base": "#0A0A0A",
    "--plan-surface-elevated": "#121212",
    "--plan-surface-overlay": "#1A1A1A",
    "--plan-surface-premium": "#1C1C1C",
    "--plan-border-subtle": "rgba(255, 255, 255, 0.06)",
    "--plan-border-default": "rgba(255, 255, 255, 0.12)",
    "--plan-border-orange": "rgba(232, 80, 2, 0.4)",
    "--plan-shadow-card": "0 2px 8px rgba(0, 0, 0, 0.4)",
    "--plan-shadow-card-hover": "0 4px 16px rgba(232, 80, 2, 0.2)",
    "--plan-shadow-premium": "0 0 60px rgba(232, 80, 2, 0.15)",
    "--plan-glow-primary": "0 0 24px rgba(232, 80, 2, 0.4)",
    "--plan-glow-card": "0 0 50px rgba(232, 80, 2, 0.15)",
    "--plan-glow-sm": GLOW_SM,
    "--plan-glow-md": GLOW_MD,
    "--plan-glow-lg": GLOW_LG,
    "--plan-typography-scale": "1.08",
  },

  "studio-pending": {
    // Studio pending - same as studio
    "--plan-accent-primary": "#e85002",
    "--plan-accent-financial": "#d8b343",
    "--plan-text-primary": "#F9F9F9",
    "--plan-text-secondary": "#A0A0A0",
    "--plan-text-tertiary": "#6B6B6B",
    "--plan-surface-base": "#0A0A0A",
    "--plan-surface-elevated": "#121212",
    "--plan-surface-overlay": "#1A1A1A",
    "--plan-surface-premium": "#1C1C1C",
    "--plan-border-subtle": "rgba(255, 255, 255, 0.06)",
    "--plan-border-default": "rgba(255, 255, 255, 0.12)",
    "--plan-border-orange": "rgba(232, 80, 2, 0.4)",
    "--plan-shadow-card": "0 2px 8px rgba(0, 0, 0, 0.4)",
    "--plan-shadow-premium": "0 0 60px rgba(232, 80, 2, 0.15)",
    "--plan-glow-primary": "0 0 24px rgba(232, 80, 2, 0.4)",
    "--plan-glow-sm": GLOW_SM,
    "--plan-glow-md": GLOW_MD,
    "--plan-glow-lg": GLOW_LG,
    "--plan-typography-scale": "1.08",
  },

  admin: {
    // Admin - same as studio
    "--plan-accent-primary": "#e85002",
    "--plan-accent-financial": "#d8b343",
    "--plan-text-primary": "#F9F9F9",
    "--plan-text-secondary": "#A0A0A0",
    "--plan-text-tertiary": "#6B6B6B",
    "--plan-surface-base": "#0A0A0A",
    "--plan-surface-elevated": "#121212",
    "--plan-surface-overlay": "#1A1A1A",
    "--plan-surface-premium": "#1C1C1C",
    "--plan-border-subtle": "rgba(255, 255, 255, 0.06)",
    "--plan-border-default": "rgba(255, 255, 255, 0.12)",
    "--plan-border-orange": "rgba(232, 80, 2, 0.4)",
    "--plan-shadow-card": "0 2px 8px rgba(0, 0, 0, 0.4)",
    "--plan-shadow-premium": "0 0 60px rgba(232, 80, 2, 0.15)",
    "--plan-glow-primary": "0 0 24px rgba(232, 80, 2, 0.4)",
    "--plan-glow-sm": GLOW_SM,
    "--plan-glow-md": GLOW_MD,
    "--plan-glow-lg": GLOW_LG,
    "--plan-typography-scale": "1.08",
  },
};

/**
 * Apply plan tokens to document root
 *
 * @param planMode - Plan mode to apply tokens for
 */
export function applyPlanTokens(planMode: PlanMode): void {
  const tokens = PLAN_TOKENS[planMode];

  if (!tokens) {
    console.warn(`No tokens defined for plan mode: ${planMode}`);
    return;
  }

  const root = document.documentElement;

  // Clear every known token first. Plans don't all define the same keys
  // (e.g. only Studio/Admin set --plan-accent-financial), so without this a
  // downgrade (Studio -> Free) would leave stale glow/gold tokens applied.
  ALL_TOKEN_KEYS.forEach((key) => {
    root.style.removeProperty(key);
  });

  // Apply the new plan's tokens
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Set data-plan attribute for CSS selectors
  root.setAttribute("data-plan", planMode);
}

// Union of every token key across all plans. Plans don't all define the same
// keys (e.g. only Studio/Admin define --plan-accent-financial), so removal
// must cover every key ever set, not just the Free plan's subset.
const ALL_TOKEN_KEYS = Array.from(
  new Set(Object.values(PLAN_TOKENS).flatMap((tokens) => Object.keys(tokens))),
);

/**
 * Remove plan tokens from document root
 */
export function removePlanTokens(): void {
  const root = document.documentElement;

  // Remove all plan tokens (across every plan, not just Free's subset)
  ALL_TOKEN_KEYS.forEach((key) => {
    root.style.removeProperty(key);
  });

  // Remove data-plan attribute
  root.removeAttribute("data-plan");
}

/**
 * Get current plan mode from document
 *
 * @returns Current plan mode or null if not set
 */
export function getCurrentPlanFromDOM(): PlanMode | null {
  return document.documentElement.getAttribute("data-plan") as PlanMode | null;
}
