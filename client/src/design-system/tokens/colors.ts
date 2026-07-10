/**
 * Design Tokens - Colors
 *
 * Paleta de cores completa do Cena Studio Design System
 * Baseada na identidade visual Frame AI
 */

export const colors = {
  // Primary Brand Colors
  primary: {
    orange: '#E85002',      // Laranja principal - brand color
    orangeLight: '#FF6B1A', // Laranja claro - hover states
    orangeDark: '#C74402',  // Laranja escuro - pressed states
  },

  // Neutral Grays (Frame System)
  neutral: {
    black: '#0A0A0A',       // Background principal
    gray1: '#141414',       // Superfícies elevadas
    gray2: '#1E1E1E',       // Cards, inputs
    gray3: '#2A2A2A',       // Borders, dividers
    gray4: '#3E3E3E',       // Disabled states
    grayLight: '#8E8E8E',   // Secondary text
    white: '#F9F9F9',       // Primary text
  },

  // Semantic Colors
  semantic: {
    success: '#22C55E',     // Success states, positive actions
    error: '#EF4444',       // Errors, destructive actions
    warning: '#F59E0B',     // Warnings, caution
    info: '#3B82F6',        // Info, neutral notifications
  },

  // Extended Palette (for data visualization, tags, etc)
  extended: {
    blue: {
      50: '#EFF6FF',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
    },
    green: {
      50: '#F0FDF4',
      400: '#4ADE80',
      500: '#22C55E',
      600: '#16A34A',
    },
    yellow: {
      50: '#FEFCE8',
      400: '#FACC15',
      500: '#EAB308',
      600: '#CA8A04',
    },
    red: {
      50: '#FEF2F2',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
    },
    purple: {
      50: '#FAF5FF',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
    },
    pink: {
      50: '#FDF2F8',
      400: '#F472B6',
      500: '#EC4899',
      600: '#DB2777',
    },
    cyan: {
      50: '#ECFEFF',
      400: '#22D3EE',
      500: '#06B6D4',
      600: '#0891B2',
    },
    indigo: {
      50: '#EEF2FF',
      400: '#818CF8',
      500: '#6366F1',
      600: '#4F46E5',
    },
  },

  // Opacity Variations (for overlays, backgrounds)
  opacity: {
    orange5: 'rgba(var(--ds-orange-rgb), 0.05)',
    orange10: 'rgba(var(--ds-orange-rgb), 0.10)',
    orange20: 'rgba(var(--ds-orange-rgb), 0.20)',
    orange30: 'rgba(var(--ds-orange-rgb), 0.30)',
    black50: 'rgba(10, 10, 10, 0.50)',
    black80: 'rgba(10, 10, 10, 0.80)',
    white10: 'rgba(249, 249, 249, 0.10)',
    white20: 'rgba(249, 249, 249, 0.20)',
  },
} as const;

// CSS Custom Properties Map
export const colorsCSSVariables = {
  // Primary
  '--color-primary': colors.primary.orange,
  '--color-primary-light': colors.primary.orangeLight,
  '--color-primary-dark': colors.primary.orangeDark,

  // Frame Brand
  '--color-frame-orange': colors.primary.orange,
  '--color-frame-black': colors.neutral.black,
  '--color-frame-gray-1': colors.neutral.gray1,
  '--color-frame-gray-2': colors.neutral.gray2,
  '--color-frame-gray-3': colors.neutral.gray3,
  '--color-frame-gray-4': colors.neutral.gray4,
  '--color-frame-gray-light': colors.neutral.grayLight,
  '--color-frame-white': colors.neutral.white,
  '--color-frame-red': colors.semantic.error,

  // Semantic
  '--color-success': colors.semantic.success,
  '--color-error': colors.semantic.error,
  '--color-warning': colors.semantic.warning,
  '--color-info': colors.semantic.info,
};

// Tailwind Config Export
export const tailwindColors = {
  'frame-orange': colors.primary.orange,
  'frame-black': colors.neutral.black,
  'frame-gray-1': colors.neutral.gray1,
  'frame-gray-2': colors.neutral.gray2,
  'frame-gray-3': colors.neutral.gray3,
  'frame-gray-4': colors.neutral.gray4,
  'frame-gray-light': colors.neutral.grayLight,
  'frame-white': colors.neutral.white,
  'frame-red': colors.semantic.error,
};

// Type Exports
export type ColorKey = keyof typeof colors;
export type PrimaryColorKey = keyof typeof colors.primary;
export type NeutralColorKey = keyof typeof colors.neutral;
export type SemanticColorKey = keyof typeof colors.semantic;
