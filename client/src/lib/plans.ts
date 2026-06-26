import type { PlanTier } from "@shared/site";

export type StripePlanId = "pro" | "studio";

/** Maps landing checkout plan IDs to Stripe subscription plan IDs */
export function toStripePlanId(planId: string): StripePlanId | null {
  if (planId === "profissional" || planId === "pro") return "pro";
  if (planId === "produtora" || planId === "studio") return "studio";
  return null;
}

export function daysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function planDisplayLabel(
  planId: string,
  planName: string,
  status: string,
  trialEndsAt: string | null,
): string {
  if (status === "trial" && trialEndsAt) {
    const days = daysRemaining(trialEndsAt);
    if (days === 0) return "Trial encerrado";
    if (days !== null) return `Trial · ${days} dias`;
  }
  if (planId === "free") return "Free";
  return planName;
}

export const CHECKOUT_MODAL_PLAN: PlanTier = "profissional";
