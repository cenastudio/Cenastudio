/**
 * PlanContext
 *
 * Provides plan information and tokens to all components.
 * Integrates with AuthContext to detect user's current plan.
 * Applies CSS custom properties based on the active plan.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <PlanProvider>
 *         <YourApp />
 *       </PlanProvider>
 *     </AuthProvider>
 *   );
 * }
 *
 * function MyComponent() {
 *   const { planMode, accentColor } = usePlanContext();
 *   return <div>Current plan: {planMode}</div>;
 * }
 * ```
 */

import React, { createContext, useContext, useMemo, useEffect } from "react";
import { useAuth } from "./AuthContext";
import type { PlanMode, PlanContextValue } from "@/types/plan";
import { getPlanMetadata } from "@/lib/plan-config";
import { applyPlanTokens } from "@/lib/design-system/apply-tokens";

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export interface PlanProviderProps {
  children: React.ReactNode;
  /** Optional override for plan mode (useful for testing/preview) */
  overridePlanMode?: PlanMode;
}

/**
 * PlanProvider
 *
 * Provider component that wraps the app and provides plan context.
 * Automatically detects user's plan from AuthContext.
 *
 * @param props - Provider props
 */
export function PlanProvider({ children, overridePlanMode }: PlanProviderProps) {
  const { user, plan, isLoading: authLoading } = useAuth();

  // Determine current plan mode
  const planMode = useMemo<PlanMode>(() => {
    // Override for testing/preview
    if (overridePlanMode) {
      return overridePlanMode;
    }

    // Admin users get admin plan
    if (user?.role === "admin") {
      return "admin";
    }

    // Authenticated users get their plan
    if (plan?.planId) {
      return plan.planId as PlanMode;
    }

    // Authenticated but no plan = free (shouldn't happen but failsafe)
    if (user) {
      return "free";
    }

    // Unauthenticated = brand mode
    return "brand";
  }, [user, plan, overridePlanMode]);

  // Get plan metadata
  const planMetadata = useMemo(() => {
    return getPlanMetadata(planMode);
  }, [planMode]);

  // Extract key values
  const accentColor = planMetadata.accentColor;
  const visualIdentity = planMetadata.visualIdentity;

  // Apply CSS tokens when plan changes
  useEffect(() => {
    applyPlanTokens(planMode);
  }, [planMode]);

  // Context value
  const contextValue = useMemo<PlanContextValue>(() => ({
    planMode,
    planMetadata,
    accentColor,
    visualIdentity,
    isLoading: authLoading,
    error: null,
  }), [planMode, planMetadata, accentColor, visualIdentity, authLoading]);

  return (
    <PlanContext.Provider value={contextValue}>
      {children}
    </PlanContext.Provider>
  );
}

/**
 * usePlanContext Hook
 *
 * Hook to access plan context in components.
 *
 * @returns Current plan context
 * @throws Error if used outside PlanProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { planMode, accentColor, visualIdentity } = usePlanContext();
 *
 *   return (
 *     <div>
 *       <p>Plan: {planMode}</p>
 *       <p>Accent: {accentColor}</p>
 *       <p>Identity: {visualIdentity}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePlanContext(): PlanContextValue {
  const context = useContext(PlanContext);

  if (!context) {
    throw new Error("usePlanContext must be used within PlanProvider");
  }

  return context;
}

/**
 * withPlanContext HOC
 *
 * Higher-order component to inject plan context as props.
 *
 * @param Component - Component to wrap
 * @returns Wrapped component with plan context props
 *
 * @example
 * ```tsx
 * interface Props {
 *   planMode: PlanMode;
 *   accentColor: string;
 * }
 *
 * function MyComponent({ planMode, accentColor }: Props) {
 *   return <div style={{ color: accentColor }}>{planMode}</div>;
 * }
 *
 * export default withPlanContext(MyComponent);
 * ```
 */
export function withPlanContext<P extends Partial<PlanContextValue>>(
  Component: React.ComponentType<P>
) {
  return function WithPlanContext(props: Omit<P, keyof PlanContextValue>) {
    const planContext = usePlanContext();

    return <Component {...(props as P)} {...planContext} />;
  };
}

/**
 * PlanGate Component
 *
 * Component that conditionally renders children based on plan access.
 * Shows upgrade prompt if user doesn't have required plan.
 *
 * @example
 * ```tsx
 * function Page() {
 *   return (
 *     <PlanGate requiredPlan="pro">
 *       <ProFeatureContent />
 *     </PlanGate>
 *   );
 * }
 * ```
 */
export interface PlanGateProps {
  /** Minimum required plan to access content */
  requiredPlan: PlanMode;
  /** Content to show if user has access */
  children: React.ReactNode;
  /** Content to show if user doesn't have access (defaults to UpgradePrompt) */
  fallback?: React.ReactNode;
}

export function PlanGate({ requiredPlan, children, fallback }: PlanGateProps) {
  const { planMode } = usePlanContext();

  // Plan hierarchy for comparison
  const planHierarchy: Record<PlanMode, number> = {
    brand: 0,
    free: 1,
    pro: 2,
    studio: 3,
    "studio-pending": 3,
    whitelabel: 4,
    enterprise: 5,
    admin: 6,
  };

  const hasAccess = planHierarchy[planMode] >= planHierarchy[requiredPlan];

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback: simple upgrade message
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Upgrade Required</h3>
        <p className="text-muted-foreground mb-4">
          This feature requires {requiredPlan} plan or higher.
        </p>
        <button
          onClick={() => (window.location.href = "/pricing")}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          View Plans
        </button>
      </div>
    </div>
  );
}
