/**
 * FeatureUpgradeRequired Component
 *
 * Wrapper component that blocks access to premium features.
 * Shows upgrade prompt if user doesn't have required plan.
 */

import React, { useState } from "react";
import { usePlanContext } from "@/contexts/PlanContext";
import { canAccessFeature } from "@/lib/feature-gating";
import type { FeatureName } from "@/types/plan";
import { PlanUpgradeModal } from "./PlanUpgradeModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, Zap, Crown, ArrowRight } from "lucide-react";
import { getPlanDisplayName } from "@/lib/plan-config";
import { useLanguage } from "@/contexts/LanguageContext";

export interface FeatureUpgradeRequiredProps {
  /** Feature being restricted */
  feature: FeatureName;

  /** Child components to render if user has access */
  children: React.ReactNode;

  /** Custom fallback component (optional) */
  fallback?: React.ReactNode;

  /** Show feature preview/teaser (optional) */
  showPreview?: boolean;

  /** Variant of the blocked state */
  variant?: "full" | "inline" | "minimal";

  /** Custom title for blocked state */
  title?: string;

  /** Custom description for blocked state */
  description?: string;
}

/**
 * FeatureUpgradeRequired Component
 */
export function FeatureUpgradeRequired({
  feature,
  children,
  fallback,
  showPreview = false,
  variant = "full",
  title,
  description,
}: FeatureUpgradeRequiredProps) {
  const { planMode } = usePlanContext();
  const { t } = useLanguage();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  /**
   * Feature metadata for display
   */
  const FEATURE_METADATA: Record<FeatureName, {
    icon: React.ReactNode;
    title: string;
    description: string;
    benefits: string[];
    requiredPlan: "pro" | "studio";
  }> = {
    "pipeline": {
      icon: <Zap className="h-8 w-8" />,
      title: t("app.upgrade.pipelineTitle"),
      description: t("app.upgrade.pipelineDesc"),
      benefits: [
        t("app.upgrade.pipelineBenefit1"),
        t("app.upgrade.pipelineBenefit2"),
        t("app.upgrade.pipelineBenefit3"),
        t("app.upgrade.pipelineBenefit4"),
      ],
      requiredPlan: "pro",
    },
    "video-reviews": {
      icon: <Sparkles className="h-8 w-8" />,
      title: t("app.upgrade.videoReviewsTitle"),
      description: t("app.upgrade.videoReviewsDesc"),
      benefits: [
        t("app.upgrade.videoReviewsBenefit1"),
        t("app.upgrade.videoReviewsBenefit2"),
        t("app.upgrade.videoReviewsBenefit3"),
        t("app.upgrade.videoReviewsBenefit4"),
      ],
      requiredPlan: "pro",
    },
    "collaboration": {
      icon: <Sparkles className="h-8 w-8" />,
      title: t("app.upgrade.collaborationTitle"),
      description: t("app.upgrade.collaborationDesc"),
      benefits: [
        t("app.upgrade.collaborationBenefit1"),
        t("app.upgrade.collaborationBenefit2"),
        t("app.upgrade.collaborationBenefit3"),
        t("app.upgrade.collaborationBenefit4"),
      ],
      requiredPlan: "pro",
    },
    "advanced-export": {
      icon: <Sparkles className="h-8 w-8" />,
      title: t("app.upgrade.advancedExportTitle"),
      description: t("app.upgrade.advancedExportDesc"),
      benefits: [
        t("app.upgrade.advancedExportBenefit1"),
        t("app.upgrade.advancedExportBenefit2"),
        t("app.upgrade.advancedExportBenefit3"),
        t("app.upgrade.advancedExportBenefit4"),
      ],
      requiredPlan: "pro",
    },
    "commercial-hub": {
      icon: <Crown className="h-8 w-8" />,
      title: t("app.upgrade.commercialHubTitle"),
      description: t("app.upgrade.commercialHubDesc"),
      benefits: [
        t("app.upgrade.commercialHubBenefit1"),
        t("app.upgrade.commercialHubBenefit2"),
        t("app.upgrade.commercialHubBenefit3"),
        t("app.upgrade.commercialHubBenefit4"),
      ],
      requiredPlan: "studio",
    },
    "proposals": {
      icon: <Crown className="h-8 w-8" />,
      title: t("app.upgrade.proposalsTitle"),
      description: t("app.upgrade.proposalsDesc"),
      benefits: [
        t("app.upgrade.proposalsBenefit1"),
        t("app.upgrade.proposalsBenefit2"),
        t("app.upgrade.proposalsBenefit3"),
        t("app.upgrade.proposalsBenefit4"),
      ],
      requiredPlan: "studio",
    },
    "contracts": {
      icon: <Crown className="h-8 w-8" />,
      title: t("app.upgrade.contractsTitle"),
      description: t("app.upgrade.contractsDesc"),
      benefits: [
        t("app.upgrade.contractsBenefit1"),
        t("app.upgrade.contractsBenefit2"),
        t("app.upgrade.contractsBenefit3"),
        t("app.upgrade.contractsBenefit4"),
      ],
      requiredPlan: "studio",
    },
    "financial-module": {
      icon: <Crown className="h-8 w-8" />,
      title: t("app.upgrade.financialTitle"),
      description: t("app.upgrade.financialDesc"),
      benefits: [
        t("app.upgrade.financialBenefit1"),
        t("app.upgrade.financialBenefit2"),
        t("app.upgrade.financialBenefit3"),
        t("app.upgrade.financialBenefit4"),
      ],
      requiredPlan: "studio",
    },
    "team-management": {
      icon: <Crown className="h-8 w-8" />,
      title: t("app.upgrade.teamTitle"),
      description: t("app.upgrade.teamDesc"),
      benefits: [
        t("app.upgrade.teamBenefit1"),
        t("app.upgrade.teamBenefit2"),
        t("app.upgrade.teamBenefit3"),
        t("app.upgrade.teamBenefit4"),
      ],
      requiredPlan: "studio",
    },
    "analytics": {
      icon: <Crown className="h-8 w-8" />,
      title: t("app.upgrade.analyticsTitle"),
      description: t("app.upgrade.analyticsDesc"),
      benefits: [
        t("app.upgrade.analyticsBenefit1"),
        t("app.upgrade.analyticsBenefit2"),
        t("app.upgrade.analyticsBenefit3"),
        t("app.upgrade.analyticsBenefit4"),
      ],
      requiredPlan: "studio",
    },
    "api": {
      icon: <Crown className="h-8 w-8" />,
      title: t("app.upgrade.apiTitle"),
      description: t("app.upgrade.apiDesc"),
      benefits: [
        t("app.upgrade.apiBenefit1"),
        t("app.upgrade.apiBenefit2"),
        t("app.upgrade.apiBenefit3"),
        t("app.upgrade.apiBenefit4"),
      ],
      requiredPlan: "studio",
    },
    "custom-branding": {
      icon: <Crown className="h-8 w-8" />,
      title: t("app.upgrade.brandingTitle"),
      description: t("app.upgrade.brandingDesc"),
      benefits: [
        t("app.upgrade.brandingBenefit1"),
        t("app.upgrade.brandingBenefit2"),
        t("app.upgrade.brandingBenefit3"),
        t("app.upgrade.brandingBenefit4"),
      ],
      requiredPlan: "studio",
    },
    "priority-support": {
      icon: <Crown className="h-8 w-8" />,
      title: t("app.upgrade.supportTitle"),
      description: t("app.upgrade.supportDesc"),
      benefits: [
        t("app.upgrade.supportBenefit1"),
        t("app.upgrade.supportBenefit2"),
        t("app.upgrade.supportBenefit3"),
        t("app.upgrade.supportBenefit4"),
      ],
      requiredPlan: "studio",
    },
    // Fallback for non-premium features
    "projects": {
      icon: <Sparkles className="h-8 w-8" />,
      title: t("app.upgrade.pipelineTitle"),
      description: t("app.upgrade.pipelineDesc"),
      benefits: [],
      requiredPlan: "pro",
    },
    "clients": {
      icon: <Sparkles className="h-8 w-8" />,
      title: t("app.upgrade.collaborationTitle"),
      description: t("app.upgrade.collaborationDesc"),
      benefits: [],
      requiredPlan: "pro",
    },
    "tools": {
      icon: <Sparkles className="h-8 w-8" />,
      title: t("app.upgrade.advancedExportTitle"),
      description: t("app.upgrade.advancedExportDesc"),
      benefits: [],
      requiredPlan: "pro",
    },
  };

  // Check if user has access
  const accessResult = canAccessFeature(feature, planMode);

  // User has access - render children
  if (accessResult.hasAccess) {
    return <>{children}</>;
  }

  // Custom fallback provided
  if (fallback) {
    return <>{fallback}</>;
  }

  // Get feature metadata
  const metadata = FEATURE_METADATA[feature] || FEATURE_METADATA["projects"];
  const displayTitle = title || metadata.title;
  const displayDescription = description || metadata.description;
  const requiredPlanName = getPlanDisplayName(accessResult.requiredPlan || "pro");

  // Minimal variant
  if (variant === "minimal") {
    return (
      <>
        <div className="flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{displayTitle}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t("app.upgrade.requiresPlan").replace("{plan}", requiredPlanName)}
              </p>
            </div>
            <Button onClick={() => setShowUpgradeModal(true)}>
              {t("app.upgrade.doUpgrade")}
            </Button>
          </div>
        </div>

        <PlanUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentPlan={planMode}
          triggerFeature={displayTitle}
          recommendedPlan={metadata.requiredPlan}
        />
      </>
    );
  }

  // Inline variant
  if (variant === "inline") {
    return (
      <>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 text-orange-500">
                {metadata.icon}
              </div>
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {displayTitle}
                  <Badge variant="outline">{requiredPlanName}</Badge>
                </CardTitle>
                <CardDescription>{displayDescription}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setShowUpgradeModal(true)} className="w-full">
              {t("app.upgrade.doUpgrade")} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        <PlanUpgradeModal
          open={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          currentPlan={planMode}
          triggerFeature={displayTitle}
          recommendedPlan={metadata.requiredPlan}
        />
      </>
    );
  }

  // Full variant (default)
  return (
    <>
      <div className="flex items-center justify-center min-h-[400px] p-8">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-yellow-500/20">
              <div className="text-orange-500">
                {metadata.icon}
              </div>
            </div>
            <CardTitle className="text-2xl">{displayTitle}</CardTitle>
            <CardDescription className="text-base mt-2">
              {displayDescription}
            </CardDescription>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Badge variant="outline">{t("app.upgrade.availableOnPlan").replace("{plan}", requiredPlanName)}</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Benefits */}
            {metadata.benefits.length > 0 && (
              <div>
                <p className="font-medium mb-3">{t("app.upgrade.whatYouGet")}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {metadata.benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-0.5 text-green-500">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview */}
            {showPreview && (
              <div className="rounded-lg border-2 border-dashed border-muted p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("app.upgrade.previewPlaceholder")}
                </p>
              </div>
            )}

            {/* CTA */}
            <div className="space-y-3 pt-4">
              <Button
                onClick={() => setShowUpgradeModal(true)}
                size="lg"
                className="w-full"
              >
                {t("app.upgrade.upgradeFor").replace("{plan}", requiredPlanName)}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {t("app.upgrade.cancelAnytime")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <PlanUpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={planMode}
        triggerFeature={displayTitle}
        recommendedPlan={metadata.requiredPlan}
      />
    </>
  );
}
