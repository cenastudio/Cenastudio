/**
 * useFeatureAccess Hook
 *
 * React hook for feature gating with automatic plan context integration.
 * Provides easy access to feature permissions and upgrade prompts.
 *
 * @example
 * ```tsx
 * function PipelineButton() {
 *   const { hasAccess, requiredPlan, UpgradePrompt } = useFeatureAccess('pipeline');
 *
 *   if (!hasAccess) {
 *     return <UpgradePrompt variant="inline" />;
 *   }
 *
 *   return <Button onClick={openPipeline}>Open Pipeline</Button>;
 * }
 * ```
 */

import { useMemo, type ReactElement } from "react";
import { usePlanContext } from "@/contexts/PlanContext";
import { canAccessFeature } from "@/lib/feature-gating";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import type { FeatureName, FeatureAccessResult } from "@/types/plan";
import type { UpgradePromptProps } from "@/components/UpgradePrompt";

export interface UseFeatureAccessResult extends FeatureAccessResult {
  /**
   * Pre-configured UpgradePrompt component for this feature
   *
   * @example
   * ```tsx
   * const { UpgradePrompt } = useFeatureAccess('pipeline');
   * return <UpgradePrompt variant="modal" />;
   * ```
   */
  UpgradePrompt: (props?: Partial<UpgradePromptProps>) => ReactElement | null;
}

/**
 * Hook for checking feature access with plan context
 *
 * Automatically resolves user's plan from PlanContext and checks feature access.
 * Returns access status and a pre-configured UpgradePrompt component.
 *
 * @param feature - Feature to check access for
 * @returns Feature access result with UpgradePrompt component
 *
 * @example
 * ```tsx
 * function FeatureComponent() {
 *   const { hasAccess, reason, UpgradePrompt } = useFeatureAccess('commercial-hub');
 *
 *   if (!hasAccess) {
 *     return (
 *       <div>
 *         <h2>Commercial Hub</h2>
 *         <UpgradePrompt />
 *       </div>
 *     );
 *   }
 *
 *   return <CommercialHubContent />;
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom upgrade handler
 * function FeatureWithTracking() {
 *   const router = useRouter();
 *   const { hasAccess, UpgradePrompt } = useFeatureAccess('analytics');
 *
 *   if (!hasAccess) {
 *     return (
 *       <UpgradePrompt
 *         variant="modal"
 *         onUpgrade={() => {
 *           analytics.track('Upgrade Intent', { feature: 'analytics' });
 *           router.push('/pricing');
 *         }}
 *       />
 *     );
 *   }
 *
 *   return <AnalyticsDashboard />;
 * }
 * ```
 */
export function useFeatureAccess(feature: FeatureName): UseFeatureAccessResult {
  const { planMode } = usePlanContext();

  // Check feature access
  const accessResult = useMemo(
    () => canAccessFeature(feature, planMode),
    [feature, planMode]
  );

  // Create pre-configured UpgradePrompt component
  const UpgradePromptComponent = useMemo(() => {
    return (props?: Partial<UpgradePromptProps>) => {
      // Don't render if user has access
      if (accessResult.hasAccess) {
        return null;
      }

      return (
        <UpgradePrompt
          feature={feature}
          currentPlan={planMode}
          requiredPlan={accessResult.requiredPlan!}
          {...props}
        />
      );
    };
  }, [feature, planMode, accessResult]);

  return {
    ...accessResult,
    UpgradePrompt: UpgradePromptComponent,
  };
}

/**
 * Hook for checking multiple features at once
 *
 * Useful when a component needs access to multiple features.
 *
 * @param features - Array of features to check
 * @returns Map of feature names to access results
 *
 * @example
 * ```tsx
 * function Dashboard() {
 *   const access = useMultipleFeatureAccess(['pipeline', 'video-reviews', 'analytics']);
 *
 *   return (
 *     <div>
 *       {access.pipeline.hasAccess && <PipelineWidget />}
 *       {access['video-reviews'].hasAccess && <VideoReviewsWidget />}
 *       {!access.analytics.hasAccess && (
 *         <access.analytics.UpgradePrompt variant="inline" />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMultipleFeatureAccess(
  features: FeatureName[]
): Record<FeatureName, UseFeatureAccessResult> {
  const { planMode } = usePlanContext();

  return useMemo(() => {
    const result: Record<string, UseFeatureAccessResult> = {};

    for (const feature of features) {
      const accessResult = canAccessFeature(feature, planMode);

      const UpgradePromptComponent = (props?: Partial<UpgradePromptProps>) => {
        if (accessResult.hasAccess) {
          return null;
        }

        return (
          <UpgradePrompt
            feature={feature}
            currentPlan={planMode}
            requiredPlan={accessResult.requiredPlan!}
            {...props}
          />
        );
      };

      result[feature] = {
        ...accessResult,
        UpgradePrompt: UpgradePromptComponent,
      };
    }

    return result as Record<FeatureName, UseFeatureAccessResult>;
  }, [features, planMode]);
}
