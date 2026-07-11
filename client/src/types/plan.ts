/**
 * Plan System Type Definitions
 *
 * This file contains all TypeScript types for the Evolutionary Design System.
 * These types enable plan-aware components, navigation filtering, and feature gating.
 */

/**
 * PlanMode
 *
 * Represents the user's subscription plan tier.
 *
 * - `brand`: Unauthenticated users viewing landing/marketing pages
 * - `free`: Individual creators with 5 core tools (max 5 clients)
 * - `pro`: Professional filmmakers with 12+ tools and Pipeline view (max 50 clients)
 * - `studio`: Production companies with full Commercial Hub and unlimited features
 * - `studio-pending`: Studio plan users awaiting payment confirmation
 * - `admin`: Administrative users with full system access
 */
export type PlanMode = "brand" | "free" | "pro" | "studio" | "studio-pending" | "admin";

/**
 * Visual Identity Theme
 *
 * Defines the overall aesthetic treatment for each plan tier.
 *
 * - `minimal`: Clean, high-contrast design (Free plan)
 * - `cockpit`: Enhanced visual richness with glow effects (Pro plan)
 * - `command-center`: Premium dual-accent system with multi-layer shadows (Studio plan)
 */
export type VisualIdentity = "minimal" | "cockpit" | "command-center";

/**
 * PlanTokens
 *
 * Represents the complete set of CSS custom properties for a plan tier.
 * These tokens are injected dynamically based on the active plan mode.
 *
 * All color values must be valid CSS color strings.
 * All shadow values must be valid CSS box-shadow syntax.
 */
export interface PlanTokens {
  // ========================================
  // Brand Identity
  // ========================================

  /** Primary brand accent color (e.g., #E85002) */
  accentPrimary: string;

  /** Secondary accent color (darker variant for depth) */
  accentSecondary: string;

  /** Tertiary accent color (lighter variant for highlights) */
  accentTertiary: string;

  /** Financial accent color (Studio plan only: #D8B343) */
  accentFinancial?: string;

  // ========================================
  // Surfaces
  // ========================================

  /** Base background color (darkest/lightest depending on theme) */
  surfaceBase: string;

  /** Elevated surface for cards/panels */
  surfaceElevated: string;

  /** Overlay surface for modals/dropdowns */
  surfaceOverlay: string;

  /** Premium surface variant (Studio plan only) */
  surfacePremium?: string;

  // ========================================
  // Borders & Lines
  // ========================================

  /** Subtle border (lowest contrast) */
  borderSubtle: string;

  /** Default border */
  borderDefault: string;

  /** Strong border (highest contrast) */
  borderStrong: string;

  /** Gold border variant (Studio plan only) */
  borderGold?: string;

  /** Orange border variant (Studio plan only) */
  borderOrange?: string;

  // ========================================
  // Shadows
  // ========================================

  /** Card shadow (base elevation) */
  shadowCard: string;

  /** Card shadow on hover (elevated) */
  shadowCardHover: string;

  /** Elevated component shadow */
  shadowElevated: string;

  /** Premium shadow (Studio plan only) */
  shadowPremium?: string;

  // ========================================
  // Glow Effects (Pro/Studio only)
  // ========================================

  /** Primary glow effect */
  glowPrimary?: string;

  /** Gold glow effect (Studio plan only) */
  glowGold?: string;

  /** Card glow effect */
  glowCard?: string;

  /** Button glow effect */
  glowButton?: string;

  /** Hover glow effect */
  glowHover?: string;

  // ========================================
  // State Colors
  // ========================================

  /** Hover state background */
  stateHover: string;

  /** Active state background */
  stateActive: string;

  /** Focus state border/outline color */
  stateFocus: string;

  /** Focus state for financial inputs (Studio plan only) */
  stateFocusGold?: string;

  // ========================================
  // Typography
  // ========================================

  /** Primary text color */
  textPrimary: string;

  /** Secondary text color (muted) */
  textSecondary: string;

  /** Tertiary text color (most muted) */
  textTertiary: string;

  /** Gold text color (Studio plan only, for financial data) */
  textGold?: string;

  /** Typography scale multiplier (1.0 for Free, 1.06 for Pro, 1.08 for Studio) */
  typographyScale: number;

  // ========================================
  // Animation
  // ========================================

  /** Fast transition duration (e.g., 150ms) */
  transitionFast?: string;

  /** Normal transition duration (e.g., 200ms) */
  transitionNormal?: string;

  /** Slow transition duration (e.g., 300ms) */
  transitionSlow?: string;
}

/**
 * PlanMetadata
 *
 * Comprehensive metadata describing a subscription plan.
 * Used for navigation filtering, feature gating, and UI adaptation.
 */
export interface PlanMetadata {
  /** Plan identifier (matches PlanMode) */
  id: PlanMode;

  /** Human-readable plan name (e.g., "Free", "Pro", "Studio") */
  displayName: string;

  /** Visual identity theme */
  visualIdentity: VisualIdentity;

  /** Primary accent color (hex code - always #E85002) */
  accentColor: string;

  /** Number of available tools/features (-1 for unlimited) */
  featureCount: number;

  /** Maximum number of projects allowed (undefined for unlimited) */
  maxProjects?: number;

  /** Maximum number of team members allowed (undefined for unlimited) */
  maxTeamMembers: number;

  /** Workflow steps specific to this plan */
  workflowSteps: string[];

  /** Navigation structure for this plan */
  navStructure: NavItem[];

  /** Whether this plan supports Commercial Hub */
  supportsCommercialHub: boolean;

  /** Whether this plan supports Financial modules */
  supportsFinancialModules: boolean;

  /** Whether this plan supports Pipeline view */
  supportsPipeline: boolean;

  /** Whether this plan supports Video Reviews */
  supportsVideoReviews: boolean;

  /** Whether this plan supports Custom Branding */
  supportsCustomBranding: boolean;

  /** Whether this plan supports API access */
  supportsAPI: boolean;
}

/**
 * NavItem
 *
 * Represents a single navigation item or group.
 * Supports hierarchical navigation with nested children (up to 3 levels).
 */
export interface NavItem {
  /** Display label */
  label: string;

  /** Route path (e.g., "/dashboard", "/tools/roteiro") */
  path: string;

  /** Icon name (from icon library) */
  icon: string;

  /** Optional badge text (e.g., "Business", "Gold", "New") */
  badge?: string;

  /** Badge variant for styling (e.g., "default", "gold", "orange") */
  badgeVariant?: "default" | "gold" | "orange" | "success" | "warning";

  /** Nested child items (for hierarchical navigation) */
  children?: NavItem[];

  /** Plans required to access this item (if undefined, accessible to all) */
  requiresPlan?: PlanMode[];

  /** Permission required to access this item (if undefined, no permission check) */
  permission?: string;

  /** Whether this item is currently active (set by routing logic) */
  active?: boolean;

  /** Whether this item is disabled (e.g., feature coming soon) */
  disabled?: boolean;

  /** Tooltip text to show on hover */
  tooltip?: string;
}

/**
 * PlanFeatures
 *
 * Feature flags and entitlements for each plan tier.
 * Used for feature gating and conditional rendering.
 */
export interface PlanFeatures {
  // Core Features
  hasProjects: boolean;
  hasClients: boolean;
  hasTools: boolean;

  // Advanced Features
  hasPipeline: boolean;
  hasVideoReviews: boolean;
  hasCollaboration: boolean;
  hasAdvancedExport: boolean;

  // Studio Features
  hasCommercialHub: boolean;
  hasProposals: boolean;
  hasContracts: boolean;
  hasFinancialModule: boolean;
  hasTeamManagement: boolean;
  hasAnalytics: boolean;
  hasAPI: boolean;
  hasCustomBranding: boolean;
  hasPrioritySupport: boolean;

  // Limits
  maxProjects: number;          // -1 for unlimited
  maxClients: number;            // -1 for unlimited
  maxTeamMembers: number;        // -1 for unlimited
  maxStorageGB: number;          // -1 for unlimited
  maxMonthlyGenerations: number; // -1 for unlimited
}

/**
 * PlanContextValue
 *
 * Value provided by PlanContext to all consuming components.
 * Provides read-only access to current plan information.
 */
export interface PlanContextValue {
  /** Current plan mode */
  planMode: PlanMode;

  /** Plan metadata (display name, features, navigation, etc.) */
  planMetadata: PlanMetadata;

  /** Primary accent color (hex code - always #E85002) */
  accentColor: string;

  /** Visual identity theme */
  visualIdentity: VisualIdentity;

  /** Whether plan data is currently loading */
  isLoading?: boolean;

  /** Error loading plan data (if any) */
  error: Error | null;
}

/**
 * PlanTokenProviderProps
 *
 * Props for PlanTokenProvider component.
 */
export interface PlanTokenProviderProps {
  /** Current plan mode */
  planMode: PlanMode;

  /** Child components to render */
  children: React.ReactNode;
}

/**
 * Feature Names
 *
 * Type-safe feature identifiers for feature gating.
 */
export type FeatureName =
  | "projects"
  | "clients"
  | "tools"
  | "pipeline"
  | "video-reviews"
  | "collaboration"
  | "advanced-export"
  | "commercial-hub"
  | "proposals"
  | "contracts"
  | "financial-module"
  | "team-management"
  | "analytics"
  | "api"
  | "custom-branding"
  | "priority-support"
  | "budget-tracking"
  | "equipment-inventory"
  | "shot-list"
  | "timesheet";

/**
 * Feature Access Result
 *
 * Result of a feature access check.
 */
export interface FeatureAccessResult {
  /** Whether the user has access to the feature */
  hasAccess: boolean;

  /** Minimum required plan (if access denied) */
  requiredPlan?: PlanMode;

  /** Reason for denial (if access denied) */
  reason?: string;
}

/**
 * Upgrade Prompt Config
 *
 * Configuration for upgrade prompts shown to users.
 */
export interface UpgradePromptConfig {
  /** Feature being prompted for */
  feature: FeatureName;

  /** Current user's plan */
  currentPlan: PlanMode;

  /** Minimum required plan */
  requiredPlan: PlanMode;

  /** Benefit explanation (what user gains by upgrading) */
  benefit: string;

  /** Whether prompt can be dismissed */
  dismissible: boolean;

  /** CTA button text */
  ctaText: string;

  /** CTA button destination */
  ctaLink: string;
}

/**
 * Navigation Filter Options
 *
 * Options for filtering navigation items.
 */
export interface NavigationFilterOptions {
  /** Current plan mode */
  planMode: PlanMode;

  /** User's permissions (set of permission strings) */
  permissions: Set<string>;

  /** Whether to show upgrade prompts for inaccessible items */
  showUpgradePrompts?: boolean;

  /** Whether to show disabled items */
  showDisabled?: boolean;
}

/**
 * Token Resolution Options
 *
 * Options for token resolution algorithm.
 */
export interface TokenResolutionOptions {
  /** Token name to resolve (without --plan- prefix) */
  tokenName: string;

  /** Fallback value if token not found */
  fallback?: string;

  /** Whether to include global tokens in fallback chain */
  includeGlobalFallback?: boolean;
}

/**
 * Plan Definition
 *
 * Complete plan definition including metadata and features.
 * Used for plan configuration and management.
 */
export interface PlanDefinition {
  /** Plan metadata */
  metadata: PlanMetadata;

  /** Token values for this plan */
  tokens: PlanTokens;

  /** Stripe price ID (for payment processing) */
  stripePriceId?: string;

  /** Monthly price in cents */
  priceMonthly?: number;

  /** Annual price in cents (with discount) */
  priceAnnual?: number;

  /** Whether this plan is currently available for purchase */
  available: boolean;

  /** Whether this plan is featured/recommended */
  featured?: boolean;

  /** Sort order for plan display */
  sortOrder: number;
}
