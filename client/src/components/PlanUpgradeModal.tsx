/**
 * PlanUpgradeModal Component
 *
 * Full-featured modal for plan selection and upgrade.
 * Shows plan comparison, pricing, and Stripe checkout integration.
 */

import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { PlanMode } from "@/types/plan";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap, Sparkles, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export interface PlanUpgradeModalProps {
  /** Whether modal is open */
  open: boolean;

  /** Callback when modal closes */
  onClose: () => void;

  /** User's current plan */
  currentPlan: PlanMode;

  /** Feature that triggered the upgrade (optional) */
  triggerFeature?: string;

  /** Recommended plan to highlight (optional) */
  recommendedPlan?: "pro" | "studio";

  /** Callback after successful upgrade */
  onUpgradeSuccess?: (plan: "pro" | "studio") => void;
}

/**
 * PlanUpgradeModal Component
 */
export function PlanUpgradeModal({
  open,
  onClose,
  currentPlan,
  triggerFeature,
  recommendedPlan = "pro",
  onUpgradeSuccess,
}: PlanUpgradeModalProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "studio">(recommendedPlan);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState(false);

  const PLAN_DETAILS = {
    free: {
      name: "Free",
      price: 0,
      priceAnnual: 0,
      icon: <Zap className="h-6 w-6" />,
      description: t("app.upgrade.freeDesc"),
      features: [
        t("app.upgrade.freeFeat1"),
        t("app.upgrade.freeFeat2"),
        t("app.upgrade.freeFeat3"),
        t("app.upgrade.freeFeat4"),
        t("app.upgrade.freeFeat5"),
      ],
      limitations: [
        t("app.upgrade.freeLim1"),
        t("app.upgrade.freeLim2"),
        t("app.upgrade.freeLim3"),
        t("app.upgrade.freeLim4"),
      ],
    },
    pro: {
      name: "Pro",
      price: 199,
      priceAnnual: 1990,
      icon: <Sparkles className="h-6 w-6" />,
      description: t("app.upgrade.proDesc"),
      badge: t("app.upgrade.mostPopular"),
      features: [
        t("app.upgrade.proFeat1"),
        t("app.upgrade.proFeat2"),
        t("app.upgrade.proFeat3"),
        t("app.upgrade.proFeat4"),
        t("app.upgrade.proFeat5"),
        t("app.upgrade.proFeat6"),
        t("app.upgrade.proFeat7"),
        t("app.upgrade.proFeat8"),
        t("app.upgrade.proFeat9"),
        t("app.upgrade.proFeat10"),
      ],
      highlights: [
        "Pipeline View",
        "Video Reviews",
        t("app.upgrade.collaborationTitle"),
      ],
    },
    studio: {
      name: "Studio",
      price: 399,
      priceAnnual: 3990,
      icon: <Crown className="h-6 w-6" />,
      description: t("app.upgrade.studioDesc"),
      badge: t("app.upgrade.complete"),
      features: [
        t("app.upgrade.studioFeat1"),
        t("app.upgrade.studioFeat2"),
        t("app.upgrade.studioFeat3"),
        t("app.upgrade.studioFeat4"),
        t("app.upgrade.studioFeat5"),
        t("app.upgrade.studioFeat6"),
        t("app.upgrade.studioFeat7"),
        t("app.upgrade.studioFeat8"),
        t("app.upgrade.studioFeat9"),
        t("app.upgrade.studioFeat10"),
        t("app.upgrade.studioFeat11"),
        t("app.upgrade.studioFeat12"),
        t("app.upgrade.studioFeat13"),
        t("app.upgrade.studioFeat14"),
        t("app.upgrade.studioFeat15"),
        t("app.upgrade.studioFeat16"),
      ],
      highlights: [
        "Commercial Hub",
        t("app.upgrade.financialTitle"),
        t("app.upgrade.teamTitle"),
        "API Access",
      ],
    },
  };

  const handleUpgrade = async () => {
    if (!user) {
      toast.error(t("app.upgrade.loginRequired"));
      return;
    }

    setIsLoading(true);

    try {
      // Get Stripe checkout URL
      const priceId = billingPeriod === "monthly"
        ? (selectedPlan === "pro" ? process.env.STRIPE_PRICE_PRO : process.env.STRIPE_PRICE_STUDIO)
        : (selectedPlan === "pro" ? process.env.STRIPE_PRICE_PRO_ANNUAL : process.env.STRIPE_PRICE_STUDIO_ANNUAL);

      // TODO: Implement Stripe checkout
      // For now, redirect to pricing page
      window.location.href = `/pricing?plan=${selectedPlan}&period=${billingPeriod}`;

      if (onUpgradeSuccess) {
        onUpgradeSuccess(selectedPlan);
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error(t("app.upgrade.errorProcessing"));
    } finally {
      setIsLoading(false);
    }
  };

  const proDetails = PLAN_DETAILS.pro;
  const studioDetails = PLAN_DETAILS.studio;

  const selectedDetails = selectedPlan === "pro" ? proDetails : studioDetails;
  const selectedPrice = billingPeriod === "monthly"
    ? selectedDetails.price
    : Math.round(selectedDetails.priceAnnual / 12);

  const savings = billingPeriod === "annual"
    ? selectedDetails.price * 2
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("app.upgrade.choosePlan")}</DialogTitle>
          <DialogDescription>
            {triggerFeature
              ? t("app.upgrade.upgradeToAccess").replace("{feature}", triggerFeature)
              : t("app.upgrade.unlockPotential")
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Billing Period Toggle */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant={billingPeriod === "monthly" ? "default" : "outline"}
              onClick={() => setBillingPeriod("monthly")}
              size="sm"
            >
              {t("app.upgrade.monthly")}
            </Button>
            <Button
              variant={billingPeriod === "annual" ? "default" : "outline"}
              onClick={() => setBillingPeriod("annual")}
              size="sm"
            >
              {t("app.upgrade.annual")}
              {billingPeriod === "annual" && (
                <Badge variant="secondary" className="ml-2">
                  -17% 🎉
                </Badge>
              )}
            </Button>
          </div>

          {/* Plan Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pro Plan */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedPlan === "pro"
                  ? "ring-2 ring-orange-500 shadow-lg"
                  : "hover:shadow-md"
              }`}
              onClick={() => setSelectedPlan("pro")}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-orange-500">
                      {proDetails.icon}
                    </div>
                    <CardTitle>{proDetails.name}</CardTitle>
                  </div>
                  {proDetails.badge && (
                    <Badge variant="secondary">{proDetails.badge}</Badge>
                  )}
                </div>
                <CardDescription>{proDetails.description}</CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      R$ {billingPeriod === "monthly" ? proDetails.price : Math.round(proDetails.priceAnnual / 12)}
                    </span>
                    <span className="text-muted-foreground">{t("app.upgrade.perMonth")}</span>
                  </div>
                  {billingPeriod === "annual" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("app.upgrade.billedAnnually")
                        .replace("{total}", String(proDetails.priceAnnual))
                        .replace("{savings}", String(proDetails.price * 2))}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {proDetails.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {proDetails.highlights && (
                  <div className="mt-4 p-3 bg-orange-500/10 rounded-lg">
                    <p className="text-xs font-medium text-orange-500 mb-2">
                      {t("app.upgrade.highlights")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {proDetails.highlights.map((highlight, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {highlight}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Studio Plan */}
            <Card
              className={`cursor-pointer transition-all ${
                selectedPlan === "studio"
                  ? "ring-2 ring-orange-500 shadow-lg"
                  : "hover:shadow-md"
              }`}
              onClick={() => setSelectedPlan("studio")}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="text-orange-500">
                      {studioDetails.icon}
                    </div>
                    <CardTitle>{studioDetails.name}</CardTitle>
                  </div>
                  {studioDetails.badge && (
                    <Badge>{studioDetails.badge}</Badge>
                  )}
                </div>
                <CardDescription>{studioDetails.description}</CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      R$ {billingPeriod === "monthly" ? studioDetails.price : Math.round(studioDetails.priceAnnual / 12)}
                    </span>
                    <span className="text-muted-foreground">{t("app.upgrade.perMonth")}</span>
                  </div>
                  {billingPeriod === "annual" && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {t("app.upgrade.billedAnnually")
                        .replace("{total}", String(studioDetails.priceAnnual))
                        .replace("{savings}", String(studioDetails.price * 2))}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2">
                  {studioDetails.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {studioDetails.highlights && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-lg">
                    <p className="text-xs font-medium text-orange-500 mb-2">
                      {t("app.upgrade.exclusiveStudio")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {studioDetails.highlights.map((highlight, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {highlight}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* CTA Section */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {t("app.upgrade.selectedPlan")} <span className="text-orange-500">{selectedDetails.name}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  R$ {selectedPrice}{t("app.upgrade.perMonth")} • {billingPeriod === "monthly" ? t("app.upgrade.monthly") : t("app.upgrade.annual")}
                  {savings > 0 && ` • ${t("app.upgrade.billedAnnually").split("•")[1]?.trim().replace("{savings}", String(savings)) || `Economize R$ ${savings}`}`}
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isLoading}>
                  {t("app.upgrade.cancel")}
                </Button>
                <Button onClick={handleUpgrade} disabled={isLoading} size="lg">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("app.upgrade.processing")}
                    </>
                  ) : (
                    <>
                      {t("app.upgrade.continueToPay")}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              {t("app.upgrade.securePayment")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook para usar o modal facilmente
 */
export function usePlanUpgradeModal(currentPlan: PlanMode = "free") {
  const [isOpen, setIsOpen] = useState(false);
  const [recommended, setRecommended] = useState<"pro" | "studio">("pro");

  const showUpgradeModal = (recommendedPlan?: "pro" | "studio") => {
    if (recommendedPlan) {
      setRecommended(recommendedPlan);
    }
    setIsOpen(true);
  };

  const PlanUpgradeModalComponent = (
    <PlanUpgradeModal
      open={isOpen}
      onClose={() => setIsOpen(false)}
      currentPlan={currentPlan}
      recommendedPlan={recommended}
    />
  );

  return {
    showUpgradeModal,
    PlanUpgradeModalComponent,
    isOpen,
  };
}
