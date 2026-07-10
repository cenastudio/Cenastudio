/**
 * Design Tokens - Spacing
 *
 * Sistema de espaçamento consistente
 * Baseado em escala de 4px (0.25rem)
 */

// Base unit: 4px (0.25rem)
const baseUnit = 4;

// Spacing Scale
export const spacing = {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  1.5: '0.375rem',  // 6px
  2: '0.5rem',      // 8px
  2.5: '0.625rem',  // 10px
  3: '0.75rem',     // 12px
  3.5: '0.875rem',  // 14px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  7: '1.75rem',     // 28px
  8: '2rem',        // 32px
  9: '2.25rem',     // 36px
  10: '2.5rem',     // 40px
  11: '2.75rem',    // 44px
  12: '3rem',       // 48px
  14: '3.5rem',     // 56px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  28: '7rem',       // 112px
  32: '8rem',       // 128px
  36: '9rem',       // 144px
  40: '10rem',      // 160px
  44: '11rem',      // 176px
  48: '12rem',      // 192px
  52: '13rem',      // 208px
  56: '14rem',      // 224px
  60: '15rem',      // 240px
  64: '16rem',      // 256px
  72: '18rem',      // 288px
  80: '20rem',      // 320px
  96: '24rem',      // 384px
} as const;

// Semantic Spacing (for common patterns)
export const semanticSpacing = {
  // Component spacing
  componentPaddingTiny: spacing[1],      // 4px
  componentPaddingSmall: spacing[2],     // 8px
  componentPadding: spacing[4],          // 16px
  componentPaddingLarge: spacing[6],     // 24px
  componentPaddingXL: spacing[8],        // 32px

  // Gap between elements
  gapTiny: spacing[1],      // 4px
  gapSmall: spacing[2],     // 8px
  gap: spacing[4],          // 16px
  gapLarge: spacing[6],     // 24px
  gapXL: spacing[8],        // 32px

  // Section spacing
  sectionGapSmall: spacing[8],   // 32px
  sectionGap: spacing[12],       // 48px
  sectionGapLarge: spacing[16],  // 64px
  sectionGapXL: spacing[24],     // 96px

  // Container padding
  containerPaddingMobile: spacing[4],   // 16px
  containerPadding: spacing[6],         // 24px
  containerPaddingLarge: spacing[8],    // 32px

  // Grid gaps
  gridGapTiny: spacing[2],    // 8px
  gridGapSmall: spacing[3],   // 12px
  gridGap: spacing[4],        // 16px
  gridGapLarge: spacing[6],   // 24px
  gridGapXL: spacing[8],      // 32px
} as const;

// Border Radius
export const borderRadius = {
  none: '0',
  sm: '0.125rem',   // 2px
  base: '0.25rem',  // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',
} as const;

// Shadows (elevação / depth)
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Custom Frame Shadows
  glow: '0 0 20px rgba(var(--ds-orange-rgb), 0.3)',
  glowLarge: '0 0 40px rgba(var(--ds-orange-rgb), 0.4)',
  card: '0 4px 16px rgba(0, 0, 0, 0.2)',
  modal: '0 20px 60px rgba(0, 0, 0, 0.5)',
} as const;

// Z-Index Scale
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  notification: 1080,
  commandPalette: 9998,
  progressBar: 9999,
} as const;

// Breakpoints (for responsive design)
export const breakpoints = {
  xs: '475px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Container Max Widths
export const containerMaxWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
  '3xl': '1600px',
  full: '100%',
} as const;

// CSS Custom Properties Map
export const spacingCSSVariables = {
  // Spacing
  '--space-0': spacing[0],
  '--space-1': spacing[1],
  '--space-2': spacing[2],
  '--space-3': spacing[3],
  '--space-4': spacing[4],
  '--space-6': spacing[6],
  '--space-8': spacing[8],
  '--space-12': spacing[12],
  '--space-16': spacing[16],
  '--space-24': spacing[24],

  // Border radius
  '--radius-sm': borderRadius.sm,
  '--radius-base': borderRadius.base,
  '--radius-md': borderRadius.md,
  '--radius-lg': borderRadius.lg,
  '--radius-xl': borderRadius.xl,

  // Shadows
  '--shadow-sm': shadows.sm,
  '--shadow-base': shadows.base,
  '--shadow-md': shadows.md,
  '--shadow-lg': shadows.lg,
  '--shadow-xl': shadows.xl,
  '--shadow-glow': shadows.glow,

  // Z-index
  '--z-dropdown': zIndex.dropdown,
  '--z-modal': zIndex.modal,
  '--z-tooltip': zIndex.tooltip,
  '--z-notification': zIndex.notification,
};

// Type Exports
export type Spacing = keyof typeof spacing;
export type SemanticSpacing = keyof typeof semanticSpacing;
export type BorderRadius = keyof typeof borderRadius;
export type Shadow = keyof typeof shadows;
export type ZIndex = keyof typeof zIndex;
export type Breakpoint = keyof typeof breakpoints;
