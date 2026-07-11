/**
 * UpgradePrompt Component
 *
 * Shows upgrade prompts when users try to access premium features.
 * Supports multiple variants: inline, modal, toast.
 */

import React from "react";
import { Link } from "wouter";
import type { FeatureName, PlanMode } from "@/types/plan";
import { getPlanDisplayName } from "@/lib/plan-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Sparkles, Zap } from "lucide-react";

export interface UpgradePromptProps {
  /** Feature being restricted */
  feature: FeatureName;

  /** User's current plan */
  currentPlan: PlanMode;

  /** Required plan to access feature */
  requiredPlan: PlanMode;

  /** Display variant */
  variant?: "inline" | "modal" | "toast" | "minimal";

  /** Custom title */
  title?: string;

  /** Custom description */
  description?: string;

  /** Custom CTA text */
  ctaText?: string;

  /** Callback when upgrade button clicked */
  onUpgrade?: () => void;

  /** Whether prompt can be dismissed */
  dismissible?: boolean;

  /** Callback when dismissed */
  onDismiss?: () => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Feature display names and benefits
 */
const FEATURE_INFO: Record<FeatureName, { name: string; benefit: string; icon: React.ReactNode }> = {
  "pipeline": {
    name: "Pipeline View",
    benefit: "Visualize your entire sales pipeline in Kanban format",
    icon: <Zap className="h-5 w-5" />,
  },
  "video-reviews": {
    name: "Video Reviews",
    benefit: "Get frame-accurate feedback with timestamped comments",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "collaboration": {
    name: "Team Collaboration",
    benefit: "Work together with your team in real-time",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "advanced-export": {
    name: "Advanced Export",
    benefit: "Export your data in multiple formats",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "commercial-hub": {
    name: "Commercial Hub",
    benefit: "Manage all commercial activities in one place",
    icon: <Zap className="h-5 w-5" />,
  },
  "proposals": {
    name: "Proposals",
    benefit: "Create professional proposals with AI",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "contracts": {
    name: "Contracts",
    benefit: "Generate and manage contracts automatically",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "financial-module": {
    name: "Financial Module",
    benefit: "Track revenue, expenses, and profitability",
    icon: <Zap className="h-5 w-5" />,
  },
  "team-management": {
    name: "Team Management",
    benefit: "Manage unlimited team members and permissions",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "analytics": {
    name: "Advanced Analytics",
    benefit: "Deep insights into your business performance",
    icon: <Zap className="h-5 w-5" />,
  },
  "api": {
    name: "API Access",
    benefit: "Integrate with your existing tools via API",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "custom-branding": {
    name: "Custom Branding",
    benefit: "White-label the platform with your brand",
    icon: <Zap className="h-5 w-5" />,
  },
  "priority-support": {
    name: "Priority Support",
    benefit: "Get help faster with priority support",
    icon: <Sparkles className="h-5 w-5" />,
  },
  // Fallback for non-premium features
  "projects": {
    name: "Projects",
    benefit: "Manage your audiovisual projects",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "clients": {
    name: "Clients",
    benefit: "Manage your client relationships",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "tools": {
    name: "AI Tools",
    benefit: "Access all 12 AI-powered tools",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "budget-tracking": {
    name: "Budget Tracking & Control",
    benefit: "Track budgeted vs actual spend per category, with automatic overspend alerts",
    icon: <Zap className="h-5 w-5" />,
  },
  "equipment-inventory": {
    name: "Equipment Inventory",
    benefit: "Register your gear and book it per project with automatic conflict blocking",
    icon: <Zap className="h-5 w-5" />,
  },
  "shot-list": {
    name: "Professional Shot List",
    benefit: "Build and reorder your shot list with drag-and-drop, then export for the crew",
    icon: <Sparkles className="h-5 w-5" />,
  },
  "timesheet": {
    name: "Smart Timesheet",
    benefit: "Track worked hours with a timer and calculate real labor cost automatically",
    icon: <Sparkles className="h-5 w-5" />,
  },
};

/**
 * UpgradePrompt Component
 */
export function UpgradePrompt({
  feature,
  currentPlan,
  requiredPlan,
  variant = "inline",
  title,
  description,
  ctaText,
  onUpgrade,
  dismissible = true,
  onDismiss,
  className = "",
}: UpgradePromptProps) {
  const featureInfo = FEATURE_INFO[feature] || FEATURE_INFO["projects"];
  const requiredPlanName = getPlanDisplayName(requiredPlan);
  const currentPlanName = getPlanDisplayName(currentPlan);

  const defaultTitle = title || `Upgrade to ${requiredPlanName}`;
  const defaultDescription = description || featureInfo.benefit;
  const defaultCtaText = ctaText || `Upgrade to ${requiredPlanName}`;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      window.location.href = "/pricing";
    }
  };

  // Minimal variant
  if (variant === "minimal") {
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <AlertCircle className="h-4 w-4" />
        <span>
          Requires{" "}
          <Badge variant="outline" className="ml-1">
            {requiredPlanName}
          </Badge>
        </span>
        <Button size="sm" variant="link" onClick={handleUpgrade} className="h-auto p-0">
          Upgrade
        </Button>
      </div>
    );
  }

  // Toast variant (compact)
  if (variant === "toast") {
    return (
      <div className={`flex items-start gap-3 p-4 bg-muted rounded-lg ${className}`}>
        <div className="flex-shrink-0 text-orange-500">
          {featureInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{defaultTitle}</p>
          <p className="text-sm text-muted-foreground mt-1">{defaultDescription}</p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleUpgrade}>
              {defaultCtaText}
            </Button>
            {dismissible && onDismiss && (
              <Button size="sm" variant="ghost" onClick={onDismiss}>
                Maybe Later
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (card)
  if (variant === "inline") {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="text-orange-500">
                {featureInfo.icon}
              </div>
              <CardTitle>{defaultTitle}</CardTitle>
            </div>
            <Badge variant="outline">{requiredPlanName}</Badge>
          </div>
          <CardDescription>{defaultDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={handleUpgrade} className="w-full sm:w-auto">
              {defaultCtaText}
            </Button>
            {dismissible && onDismiss && (
              <Button variant="outline" onClick={onDismiss} className="w-full sm:w-auto">
                Maybe Later
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Currently on {currentPlanName} plan
          </p>
        </CardContent>
      </Card>
    );
  }

  // Modal variant (full-featured)
  return (
    <div className={`max-w-md mx-auto ${className}`}>
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/10">
            <div className="text-orange-500">
              {featureInfo.icon}
            </div>
          </div>
          <CardTitle className="text-xl">{defaultTitle}</CardTitle>
          <CardDescription className="mt-2">{defaultDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Plan</span>
              <Badge variant="secondary">{currentPlanName}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Required Plan</span>
              <Badge>{requiredPlanName}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Button onClick={handleUpgrade} className="w-full" size="lg">
              {defaultCtaText}
            </Button>
            {dismissible && onDismiss && (
              <Button variant="outline" onClick={onDismiss} className="w-full">
                Maybe Later
              </Button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            <Link href="/pricing" className="underline hover:no-underline">
              Compare all plans
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
