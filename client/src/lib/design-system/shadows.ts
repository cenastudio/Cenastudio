/**
 * Shadow System Utility
 *
 * Provides plan-aware shadow generation that:
 * 1. Applies plan-specific shadow styles (Free: simple, Pro: glows, Studio: premium)
 * 2. Handles dark/light mode transitions
 * 3. Respects reduced motion preferences
 *
 * Shadow characteristics by plan:
 * - Free: Simple, high-contrast shadows (4-12px blur)
 * - Pro: Enhanced shadows with orange glow effects (8-24px blur)
 * - Studio: Premium multi-layer shadows with inset borders and gold glows
 */

import { resolvePlanToken, hasGlowEffects, hasDualAccent } from './token-resolver';
import { SITE_CONFIG } from "@shared/site";
import { hexToRgba } from "@shared/color";

/**
 * Shadow elevation levels
 *
 * Defines the visual hierarchy of elevated surfaces.
 * Higher levels = more elevation = stronger shadows.
 */
export const SHADOW_LEVELS = {
  none: 0,
  xs: 1,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
  '2xl': 6,
} as const;

export type ShadowLevel = keyof typeof SHADOW_LEVELS;

/**
 * Shadow context types
 *
 * Different contexts may require different shadow treatments.
 * Studio plan uses gold shadows for financial contexts.
 */
export type ShadowContext = 'primary' | 'financial';

/**
 * Base shadow configurations (Free plan baseline)
 *
 * Simple, clean shadows without glow effects.
 * Used as fallback for all plans.
 */
const BASE_SHADOWS: Record<ShadowLevel, string> = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.1)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
  md: '0 4px 8px rgba(0, 0, 0, 0.12)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.15)',
  xl: '0 12px 24px rgba(0, 0, 0, 0.18)',
  '2xl': '0 16px 32px rgba(0, 0, 0, 0.2)',
};

/**
 * Pro plan shadows (with orange glow)
 *
 * Enhanced shadows with subtle orange tint for "Filmmaker Cockpit" aesthetic.
 * Adds glow effects to interactive elements.
 */
const PRO_SHADOWS: Record<ShadowLevel, string> = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.1)',
  sm: `0 2px 4px rgba(0, 0, 0, 0.1), 0 0 8px ${hexToRgba(SITE_CONFIG.primaryColor, 0.05)}`,
  md: `0 4px 8px rgba(0, 0, 0, 0.12), 0 0 12px ${hexToRgba(SITE_CONFIG.primaryColor, 0.08)}`,
  lg: `0 8px 16px rgba(0, 0, 0, 0.15), 0 0 16px ${hexToRgba(SITE_CONFIG.primaryColor, 0.1)}`,
  xl: `0 12px 24px rgba(0, 0, 0, 0.18), 0 0 24px ${hexToRgba(SITE_CONFIG.primaryColor, 0.12)}`,
  '2xl': `0 16px 32px rgba(0, 0, 0, 0.2), 0 0 32px ${hexToRgba(SITE_CONFIG.primaryColor, 0.15)}`,
};

/**
 * Studio plan shadows (premium multi-layer with dual accents)
 *
 * Premium shadows with inset borders and contextual glow:
 * - Primary context: orange glow (#E85002)
 * - Financial context: gold glow (#D8B343)
 */
const STUDIO_SHADOWS: Record<ShadowLevel, string> = {
  none: 'none',
  xs: `0 1px 2px rgba(0, 0, 0, 0.1), inset 0 0 0 1px ${hexToRgba(SITE_CONFIG.primaryColor, 0.1)}`,
  sm: `0 2px 4px rgba(0, 0, 0, 0.1), 0 0 8px ${hexToRgba(SITE_CONFIG.primaryColor, 0.06)}, inset 0 0 0 1px ${hexToRgba(SITE_CONFIG.primaryColor, 0.15)}`,
  md: `0 4px 8px rgba(0, 0, 0, 0.12), 0 0 12px ${hexToRgba(SITE_CONFIG.primaryColor, 0.08)}, inset 0 0 0 1px ${hexToRgba(SITE_CONFIG.primaryColor, 0.2)}`,
  lg: `0 8px 16px rgba(0, 0, 0, 0.15), 0 0 16px ${hexToRgba(SITE_CONFIG.primaryColor, 0.1)}, inset 0 0 0 1px ${hexToRgba(SITE_CONFIG.primaryColor, 0.25)}`,
  xl: `0 12px 24px rgba(0, 0, 0, 0.18), 0 0 24px ${hexToRgba(SITE_CONFIG.primaryColor, 0.12)}, inset 0 0 0 1px ${hexToRgba(SITE_CONFIG.primaryColor, 0.3)}`,
  '2xl': `0 16px 32px rgba(0, 0, 0, 0.2), 0 0 32px ${hexToRgba(SITE_CONFIG.primaryColor, 0.15)}, inset 0 0 0 1px ${hexToRgba(SITE_CONFIG.primaryColor, 0.35)}`,
};

/**
 * Studio financial shadows (gold glow for financial modules)
 *
 * Same structure as primary shadows, but with gold accent (#D8B343).
 */
const STUDIO_FINANCIAL_SHADOWS: Record<ShadowLevel, string> = {
  none: 'none',
  xs: '0 1px 2px rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(216, 179, 67, 0.1)',
  sm: '0 2px 4px rgba(0, 0, 0, 0.1), 0 0 8px rgba(216, 179, 67, 0.06), inset 0 0 0 1px rgba(216, 179, 67, 0.15)',
  md: '0 4px 8px rgba(0, 0, 0, 0.12), 0 0 12px rgba(216, 179, 67, 0.08), inset 0 0 0 1px rgba(216, 179, 67, 0.2)',
  lg: '0 8px 16px rgba(0, 0, 0, 0.15), 0 0 16px rgba(216, 179, 67, 0.1), inset 0 0 0 1px rgba(216, 179, 67, 0.25)',
  xl: '0 12px 24px rgba(0, 0, 0, 0.18), 0 0 24px rgba(216, 179, 67, 0.12), inset 0 0 0 1px rgba(216, 179, 67, 0.3)',
  '2xl': '0 16px 32px rgba(0, 0, 0, 0.2), 0 0 32px rgba(216, 179, 67, 0.15), inset 0 0 0 1px rgba(216, 179, 67, 0.35)',
};

/**
 * Get shadow value for current plan
 *
 * Resolves the appropriate shadow based on:
 * 1. Plan mode (Free/Pro/Studio)
 * 2. Shadow level (xs to 2xl)
 * 3. Context (primary vs financial)
 *
 * @param level - Shadow elevation level
 * @param context - Shadow context (primary or financial)
 * @returns CSS box-shadow value
 *
 * @example
 * ```typescript
 * // Free plan: simple shadow
 * const shadow = getShadow('md'); // '0 4px 8px rgba(0, 0, 0, 0.12)'
 *
 * // Pro plan: shadow with orange glow
 * const shadow = getShadow('md'); // '0 4px 8px rgba(0, 0, 0, 0.12), 0 0 12px ${hexToRgba(SITE_CONFIG.primaryColor, )}'
 *
 * // Studio plan (financial module): shadow with gold glow
 * const shadow = getShadow('md', 'financial');
 * ```
 */
export function getShadow(
  level: ShadowLevel,
  context: ShadowContext = 'primary'
): string {
  // Check if plan has glow effects
  const hasGlow = hasGlowEffects();
  const isDualAccent = hasDualAccent();

  // Studio plan with financial context
  if (isDualAccent && context === 'financial') {
    return STUDIO_FINANCIAL_SHADOWS[level];
  }

  // Studio plan with primary context
  if (isDualAccent) {
    return STUDIO_SHADOWS[level];
  }

  // Pro plan (has glow but not dual accent)
  if (hasGlow) {
    return PRO_SHADOWS[level];
  }

  // Free plan (no glow)
  return BASE_SHADOWS[level];
}

/**
 * Get interactive shadow states
 *
 * Returns shadow values for different interactive states (rest, hover, active).
 * Useful for creating consistent interactive feedback.
 *
 * @param baseLevel - Base shadow level at rest state
 * @param context - Shadow context
 * @returns Object with shadow values for each state
 *
 * @example
 * ```typescript
 * const shadows = getInteractiveShadows('md');
 *
 * // CSS usage:
 * // box-shadow: ${shadows.rest};
 * // &:hover { box-shadow: ${shadows.hover}; }
 * // &:active { box-shadow: ${shadows.active}; }
 * ```
 */
export function getInteractiveShadows(
  baseLevel: ShadowLevel,
  context: ShadowContext = 'primary'
) {
  // Map shadow levels to their elevation indices
  const levelMap: Record<ShadowLevel, number> = {
    none: 0,
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
    '2xl': 6,
  };

  const levels = Object.keys(levelMap) as ShadowLevel[];
  const currentIndex = levelMap[baseLevel];

  // Calculate hover and active levels
  const hoverIndex = Math.min(currentIndex + 1, levels.length - 1);
  const activeIndex = Math.max(currentIndex - 1, 0);

  return {
    rest: getShadow(baseLevel, context),
    hover: getShadow(levels[hoverIndex], context),
    active: getShadow(levels[activeIndex], context),
  };
}

/**
 * Create custom shadow with glow
 *
 * Generates a custom shadow with optional glow effect.
 * Useful for one-off shadow needs that don't fit the standard levels.
 *
 * @param blur - Blur radius in pixels
 * @param spread - Spread radius in pixels (optional)
 * @param color - Shadow color (optional, defaults to black)
 * @param glowColor - Glow color for plan-aware glow (optional)
 * @param glowBlur - Glow blur radius (optional, defaults to blur * 1.5)
 * @returns CSS box-shadow value
 *
 * @example
 * ```typescript
 * // Simple shadow
 * const shadow = createCustomShadow(8, 0, 'rgba(0, 0, 0, 0.1)');
 * // '0 4px 8px 0 rgba(0, 0, 0, 0.1)'
 *
 * // Shadow with orange glow (Pro/Studio plans only)
 * const shadow = createCustomShadow(
 *   8,
 *   0,
 *   'rgba(0, 0, 0, 0.1)',
 *   '#e85002',
 *   12
 * );
 * ```
 */
export function createCustomShadow(
  blur: number,
  spread: number = 0,
  color: string = 'rgba(0, 0, 0, 0.12)',
  glowColor?: string,
  glowBlur?: number
): string {
  // Base shadow offset (half of blur)
  const offsetY = Math.round(blur / 2);

  // Create base shadow
  let shadow = `0 ${offsetY}px ${blur}px ${spread}px ${color}`;

  // Add glow if plan supports it and glow color is provided
  if (glowColor && hasGlowEffects()) {
    const glowRadius = glowBlur || Math.round(blur * 1.5);
    const glowAlpha = 0.1; // Default glow opacity

    // Parse glow color to add alpha if not present
    let glowWithAlpha = glowColor;
    if (glowColor.startsWith('#')) {
      // Convert hex to rgba
      const r = parseInt(glowColor.slice(1, 3), 16);
      const g = parseInt(glowColor.slice(3, 5), 16);
      const b = parseInt(glowColor.slice(5, 7), 16);
      glowWithAlpha = `rgba(${r}, ${g}, ${b}, ${glowAlpha})`;
    }

    shadow += `, 0 0 ${glowRadius}px ${glowWithAlpha}`;
  }

  return shadow;
}

/**
 * Get inset shadow for sunken elements
 *
 * Creates inset shadows for input fields, wells, and other sunken elements.
 *
 * @param level - Shadow intensity level
 * @returns CSS box-shadow value with inset
 *
 * @example
 * ```typescript
 * const inputShadow = getInsetShadow('sm');
 * // 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
 * ```
 */
export function getInsetShadow(level: ShadowLevel): string {
  const baseShadow = BASE_SHADOWS[level];

  if (baseShadow === 'none') {
    return 'none';
  }

  // Convert outset shadow to inset
  return `inset ${baseShadow}`;
}

/**
 * Get focus ring shadow
 *
 * Creates an accessible focus indicator that respects plan aesthetics.
 * Uses plan-appropriate accent color for the focus ring.
 *
 * @param context - Focus context (primary or financial)
 * @returns CSS box-shadow value for focus state
 *
 * @example
 * ```typescript
 * // CSS usage:
 * // &:focus-visible {
 * //   outline: none;
 * //   box-shadow: ${getFocusRing()};
 * // }
 * ```
 */
export function getFocusRing(context: ShadowContext = 'primary'): string {
  const isDualAccent = hasDualAccent();

  // Determine accent color based on context. Default derives from
  // SITE_CONFIG.primaryColor so branding changes propagate automatically.
  let accentColor = SITE_CONFIG.primaryColor;

  if (isDualAccent && context === 'financial') {
    accentColor = '#d8b343'; // Gold
  }

  // Create focus ring with accent color
  // Uses two layers: solid ring + outer glow
  return `0 0 0 2px ${accentColor}, 0 0 0 4px ${accentColor}33`;
}

/**
 * Check if reduced motion is preferred
 *
 * Respects user's motion preferences for shadow transitions.
 *
 * @returns True if reduced motion is preferred
 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get shadow transition CSS
 *
 * Returns appropriate transition timing for shadow animations.
 * Respects reduced motion preferences.
 *
 * @param duration - Transition duration in milliseconds (default: 200)
 * @returns CSS transition value
 *
 * @example
 * ```typescript
 * const transition = getShadowTransition();
 * // Normal: 'box-shadow 200ms ease-out'
 * // Reduced motion: 'box-shadow 0ms'
 * ```
 */
export function getShadowTransition(duration: number = 200): string {
  if (prefersReducedMotion()) {
    return 'box-shadow 0ms';
  }

  return `box-shadow ${duration}ms ease-out`;
}

/**
 * Shadow preset configurations
 *
 * Pre-configured shadow styles for common UI elements.
 */
export const SHADOW_PRESETS = {
  // Card shadows
  'card-rest': 'sm' as ShadowLevel,
  'card-hover': 'md' as ShadowLevel,
  'card-active': 'xs' as ShadowLevel,

  // Modal shadows
  'modal-backdrop': 'xl' as ShadowLevel,
  'modal-content': '2xl' as ShadowLevel,

  // Dropdown shadows
  'dropdown': 'lg' as ShadowLevel,
  'dropdown-item-hover': 'sm' as ShadowLevel,

  // Button shadows
  'button-rest': 'xs' as ShadowLevel,
  'button-hover': 'sm' as ShadowLevel,
  'button-active': 'none' as ShadowLevel,

  // Input shadows
  'input-rest': 'none' as ShadowLevel,
  'input-focus': 'sm' as ShadowLevel,

  // Floating elements
  'tooltip': 'md' as ShadowLevel,
  'popover': 'lg' as ShadowLevel,
  'floating-action-button': 'xl' as ShadowLevel,
} as const;

export type ShadowPreset = keyof typeof SHADOW_PRESETS;

/**
 * Get shadow from preset
 *
 * Convenient helper to get shadow values from semantic presets.
 *
 * @param preset - Shadow preset name
 * @param context - Shadow context
 * @returns CSS box-shadow value
 *
 * @example
 * ```tsx
 * <div style={{ boxShadow: getShadowPreset('card-rest') }}>
 *   Card Content
 * </div>
 * ```
 */
export function getShadowPreset(
  preset: ShadowPreset,
  context: ShadowContext = 'primary'
): string {
  const level = SHADOW_PRESETS[preset];
  return getShadow(level, context);
}
