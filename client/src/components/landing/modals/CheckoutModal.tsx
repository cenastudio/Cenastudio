import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { startCheckout } from "@/lib/api";
import { WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from "@/lib/constants";
import { toStripePlanId } from "@/lib/plans";
import { MessageCircle, CreditCard, Loader2, Check, Zap, Sparkles, Crown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ─── PLAN CONFIG — Edit prices and features here ───────────────────────────
const PLANS = [
  {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    icon: Zap,
    color: "rgba(167,167,167,0.9)",
    colorBg: "rgba(167,167,167,0.06)",
    colorBorder: "rgba(167,167,167,0.2)",
    description: "Para explorar a plataforma",
    features: [
      "5 clientes",
      "5 gerações IA/mês",
      "Projetos para teste",
      "Ferramentas básicas",
      "Export .txt",
    ],
    cta: null, // No CTA for free
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 199,
    icon: Sparkles,
    color: "#FF6B00",
    colorBg: "rgba(255,107,0,0.06)",
    colorBorder: "rgba(255,107,0,0.3)",
    description: "Para freelancers e criadores",
    badge: "Popular",
    features: [
      "15 clientes",
      "+ Clientes adicionais",
      "100 gerações IA/mês",
      "Projetos ilimitados",
      "Todas as ferramentas IA",
      "Export PDF e DOCX",
      "Video Reviews com anotações",
      "CRM completo + pipeline",
      "Suporte prioritário",
    ],
    stripePlanId: "pro",
  },
  {
    id: "studio",
    name: "Studio",
    priceMonthly: 399,
    icon: Crown,
    color: "#FFB800",
    colorBg: "rgba(255,184,0,0.06)",
    colorBorder: "rgba(255,184,0,0.35)",
    description: "Para produtoras e agências",
    badge: "Completo",
    features: [
      "50 clientes",
      "+ Clientes adicionais",
      "Gerações ilimitadas",
      "Tudo do Pro",
      "5 membros de equipe",
      "Arquivos e aprovações por projeto",
      "Relatórios operacionais",
      "Suporte premium",
    ],
    stripePlanId: "studio",
  },
] as const;
// ────────────────────────────────────────────────────────────────────────────

export function CheckoutModal() {
  const { t } = useLanguage();
  const { modals, closeModal, selectedPlan } = useApp();
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkingPlan, setCheckingPlan] = useState<string | null>(null);
  const isOpen = modals.checkout;

  // Determine default selected plan from context
  const defaultPlanId = selectedPlan === "produtora" ? "studio" : "pro";
  const [activePlan, setActivePlan] = useState<"pro" | "studio">(defaultPlanId);

  const handleStripeCheckout = async (planId: "pro" | "studio") => {
    const stripePlanId = toStripePlanId(planId);
    if (!stripePlanId) {
      toast.error("Plano inválido.");
      return;
    }

    if (!isAuthenticated) {
      closeModal("checkout");
      setLocation(`/register?plan=${stripePlanId}`);
      toast.message("Crie sua conta para continuar.");
      return;
    }

    setCheckingPlan(planId);
    setIsCheckingOut(true);
    try {
      await startCheckout(stripePlanId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar checkout.");
      setIsCheckingOut(false);
      setCheckingPlan(null);
    }
  };

  const planData = PLANS.find((p) => p.id === activePlan) || PLANS[1];
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE(planData.name))}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal("checkout")}>
      <DialogContent className="cinematic-theme sm:max-w-2xl p-0 overflow-hidden">
        <div
          style={{
            background: "linear-gradient(160deg, rgba(15,12,10,0.96) 0%, rgba(8,8,8,0.98) 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "16px",
          }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-frame-gray-3/40">
            <DialogHeader>
              <DialogTitle className="frame-title text-2xl text-frame-white">Escolher plano</DialogTitle>
              <DialogDescription className="text-frame-gray-light text-sm font-light mt-1">
                Assine pelo Stripe ou fale conosco para PIX, transferência ou boleto.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Plan tabs */}
          <div className="px-6 pt-5">
            <div className="grid grid-cols-3 gap-2 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                const isActive = activePlan === plan.id || (plan.id === "free" && activePlan === "free");
                const isFree = plan.id === "free";
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => !isFree && setActivePlan(plan.id as "pro" | "studio")}
                    disabled={isFree}
                    className={`relative flex flex-col items-center gap-1 py-3 px-2 rounded-md transition-all duration-200 ${isFree ? "opacity-50 cursor-default" : "cursor-pointer"}`}
                    style={{
                      background: !isFree && activePlan === plan.id ? plan.colorBg : "transparent",
                      border: !isFree && activePlan === plan.id ? `1px solid ${plan.colorBorder}` : "1px solid transparent",
                    }}
                  >
                    {plan.badge && (
                      <span
                        className="absolute -top-2 left-1/2 -translate-x-1/2 font-frame-mono text-[0.55rem] uppercase tracking-[0.1em] px-2 py-0.5 rounded-full"
                        style={{ background: plan.color, color: "#000", fontWeight: 700 }}
                      >
                        {plan.badge}
                      </span>
                    )}
                    <Icon className="w-4 h-4" style={{ color: activePlan === plan.id && !isFree ? plan.color : "#a7a7a7" }} />
                    <span className="font-frame-mono text-[0.68rem] uppercase tracking-[0.1em]" style={{ color: activePlan === plan.id && !isFree ? plan.color : "#a7a7a7" }}>
                      {plan.name}
                    </span>
                    <span className="font-bold text-[0.9rem]" style={{ color: activePlan === plan.id && !isFree ? "#f9f9f9" : "#646464" }}>
                      {plan.priceMonthly === 0 ? "Grátis" : `R$ ${plan.priceMonthly}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active plan features */}
          <div className="px-6 py-5">
            <div
              className="rounded-lg p-4 space-y-3"
              style={{ background: planData.colorBg, border: `1px solid ${planData.colorBorder}` }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.15em]" style={{ color: planData.color }}>
                    {planData.name} · R$ {planData.priceMonthly}/mês
                  </p>
                  <p className="text-sm text-frame-gray-light mt-0.5">{planData.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {planData.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 shrink-0" style={{ color: planData.color }} />
                    <span className="text-xs text-frame-white">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 pb-6 space-y-3">
            <button
              type="button"
              disabled={isCheckingOut}
              onClick={() => handleStripeCheckout(activePlan)}
              className="frame-btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              {isCheckingOut && checkingPlan === activePlan
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <CreditCard className="w-4 h-4" />
              }
              {isAuthenticated ? `Assinar ${planData.name} com Stripe` : `Criar conta e assinar ${planData.name}`}
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="frame-btn-ghost w-full flex items-center justify-center gap-2 py-2.5 text-sm no-underline"
            >
              <MessageCircle className="w-4 h-4" />
              PIX, boleto ou transferência — falar no WhatsApp
            </a>

            <p className="text-[0.65rem] text-frame-gray-muted text-center font-light">
              Pagamentos processados via Stripe · Cartão, PIX e boleto aceitos
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
