import { PRICING } from "@shared/site";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { startCheckout } from "@/lib/api";
import { toStripePlanId } from "@/lib/plans";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CreditCard, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";

// EN translations for plan descriptions and features from shared/site.ts (which is PT).
// Keyed by the original PT string. When locale === 'en', we look up the EN version.
// IMPORTANT: keep this dictionary's keys in sync with the PT strings in
// shared/site.ts PRICING — mismatched keys silently fall back to PT text
// for English users (see translatePlanText below).
const PLAN_TEXT_EN: Record<string, string> = {
  // Periods
  "/mês": "/mo",
  "/mês — mais popular": "/mo — most popular",
  "/mês — consulta": "/mo — custom quote",
  // Descriptions
  "Teste o Cena por 14 dias com tudo liberado": "Try Cena for 14 days with everything unlocked",
  "Para freelancers e produtoras pequenas (1-3 pessoas)": "For freelancers and small production companies (1-3 people)",
  "Para produtoras médias com controle operacional (5-15 pessoas)": "For mid-size production companies with operational control (5-15 people)",
  "Para produtoras estabelecidas que querem marca própria (15-50 pessoas)": "For established production companies that want their own brand (15-50 people)",
  "Para redes de produtoras, holdings, agências grandes (50+ pessoas)": "For production networks, holdings, large agencies (50+ people)",
  // ROI
  "💡 Economize 10h/mês em burocracia": "💡 Save 10h/month on paperwork",
  "🚀 Ganhe 20% mais capacidade operacional sem contratar": "🚀 Gain 20% more operational capacity without hiring",
  "💎 Posicionamento premium, sem custos de desenvolvimento": "💎 Premium positioning, no development costs",
  "🏢 Múltiplas marcas, API privada, SLA 99.9%": "🏢 Multiple brands, private API, 99.9% SLA",
  // Features - Free
  "5 gerações com IA/mês": "5 AI generations/month",
  "Acesso inicial às ferramentas": "Starter access to tools",
  "Templates básicos de projeto": "Basic project templates",
  "Export .txt": ".txt export",
  "CRM básico de clientes": "Basic client CRM",
  "Até 5 clientes cadastrados": "Up to 5 registered clients",
  "Suporte por email": "Email support",
  // Features - Pro
  "15 clientes ativos": "15 active clients",
  "100 gerações com IA/mês": "100 AI generations/month",
  "Templates profissionais de projeto": "Professional project templates",
  "Shot list com drag-and-drop": "Drag-and-drop shot list",
  "Decupagem com IA": "AI shot breakdown",
  "Timesheet e controle de horas": "Timesheet and time tracking",
  "Review de vídeos com anotações": "Video reviews with annotations",
  "Portal do cliente com aprovações": "Client portal with approvals",
  "CRM completo + pipeline comercial": "Full CRM + sales pipeline",
  "Export PDF e DOCX": "PDF and DOCX export",
  "Biblioteca de assets (25GB)": "Asset library (25GB)",
  "Suporte prioritário (48h)": "Priority support (48h)",
  // Features - Studio
  "50 clientes ativos": "50 active clients",
  "Gerações IA ilimitadas": "Unlimited AI generations",
  "Tudo do Pro +": "Everything in Pro +",
  "Templates customizados ilimitados": "Unlimited custom templates",
  "Shot list avançado com cenas": "Advanced scene-based shot list",
  "Equipe e colaboradores ilimitada": "Unlimited team and collaborators",
  "Webhooks para automação": "Webhooks for automation",
  "Exportar cronograma para agenda (.ics)": "Export schedule to calendar (.ics)",
  "Gerenciamento de sessões avançado": "Advanced session management",
  "Budget Tracking & Control 🔥": "Budget Tracking & Control 🔥",
  "Equipment Inventory 🔥": "Equipment Inventory 🔥",
  "Biblioteca de assets (250GB)": "Asset library (250GB)",
  "Relatórios operacionais completos": "Complete operational reports",
  "Suporte prioritário (24h)": "Priority support (24h)",
  // Features - White-Label
  "Clientes ilimitados": "Unlimited clients",
  "Tudo do Studio +": "Everything in Studio +",
  "Domínio customizado (seu-site.com)": "Custom domain (your-site.com)",
  "Logo e cores personalizadas": "Custom logo and colors",
  "Email personalizado": "Custom email",
  "Portal 100% white-label": "100% white-label portal",
  "Remoção de marca Cena Studio": "Cena Studio branding removed",
  "Equipe e colaboradores (10 usuários)": "Team and collaborators (10 users)",
  "Biblioteca de assets (1TB)": "Asset library (1TB)",
  "Onboarding dedicado (2h)": "Dedicated onboarding (2h)",
  "Suporte prioritário (4h)": "Priority support (4h)",
  "SLA 99.5%": "99.5% SLA",
  // Features - Enterprise
  "Tudo ilimitado": "Everything unlimited",
  "Múltiplas marcas white-label": "Multiple white-label brands",
  "API privada para integrações": "Private API for integrations",
  "Assets ilimitados (custom storage)": "Unlimited assets (custom storage)",
  "Usuários ilimitados": "Unlimited users",
  "Integração Stripe 1% fee": "Stripe integration, 1% fee",
  "Onboarding dedicado (8h)": "Dedicated onboarding (8h)",
  "Suporte telefônico 24/7": "24/7 phone support",
  "SLA 99.9%": "99.9% SLA",
  "Account manager dedicado": "Dedicated account manager",
  "Custom features sob demanda": "Custom features on demand",
};

function translatePlanText(text: string, isEn: boolean): string {
  if (!isEn) return text;
  return PLAN_TEXT_EN[text] ?? text;
}

export default function PricingSection() {
  const { t, locale } = useLanguage();
  const isEn = locale === "en";
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [showTailoredPlans, setShowTailoredPlans] = useState(false);

  const handleSelectPlan = async (planId: string) => {
    if (planId === "iniciante") {
      setLocation("/register");
      return;
    }

    // White-label and Enterprise redirect to contact
    if (planId === "whitelabel" || planId === "enterprise") {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const stripePlanId = toStripePlanId(planId);
    if (!stripePlanId) {
      toast.error(t("app.landing.pricing.invalidPlan") as string);
      return;
    }

    if (!isAuthenticated) {
      setLocation(`/register?plan=${stripePlanId}`);
      toast.message(t("app.landing.pricing.loginPrompt") as string);
      return;
    }

    try {
      await startCheckout(stripePlanId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.landing.pricing.checkoutError") as string);
    }
  };

  const ctaLabel = (planId: string) => {
    if (planId === "iniciante") return t("app.landing.pricing.freeCta") as string;
    if (planId === "whitelabel" || planId === "enterprise") {
      return isEn ? "Contact Sales" : "Solicitar Proposta";
    }
    if (planId === "produtora") {
      return isAuthenticated
        ? t("app.landing.pricing.activateStudio") as string
        : t("app.landing.pricing.createStudio") as string;
    }
    return isAuthenticated
      ? t("app.landing.pricing.activatePro") as string
      : t("app.landing.pricing.createPro") as string;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  const selfServePlans = PRICING.filter((plan) => ["iniciante", "profissional", "produtora"].includes(plan.id));
  const tailoredPlans = PRICING.filter((plan) => ["whitelabel", "enterprise"].includes(plan.id));

  const renderPlan = (plan: (typeof PRICING)[number]) => (
    <motion.article
      key={plan.id}
      variants={cardVariants}
      whileHover={{ y: -8 }}
      className={`landing-card relative overflow-hidden ${plan.highlight ? "border-frame-orange/70" : ""}`}
      data-testid={`pricing-plan-${plan.id}`}
    >
      <div className="relative z-10 p-7 sm:p-8 lg:p-9">
        <div className="mb-4 font-frame-mono text-[0.64rem] uppercase tracking-[0.2em] text-frame-orange">
          {plan.tier.replace(/^\/\/\s*/, "")}
        </div>

        <div className="mb-2">
          <span className="landing-heading text-[3.2rem]">{plan.price}</span>
          <span className="ml-2 text-sm font-light text-[var(--landing-muted)]">{translatePlanText(plan.period, isEn)}</span>
        </div>

        <p className="mb-7 text-sm font-light leading-relaxed text-[var(--landing-muted)]">
          {translatePlanText(plan.description, isEn)}
        </p>

        {plan.roi && (
          <div className="mb-6 border border-frame-orange/30 bg-frame-orange/10 px-3 py-2">
            <p className="text-xs font-medium text-frame-orange">{translatePlanText(plan.roi, isEn)}</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSelectPlan(plan.id)}
          className={`mb-7 flex min-h-11 w-full items-center justify-center gap-2 ${
            plan.highlight ? "frame-btn-primary" : "frame-btn-ghost"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          {ctaLabel(plan.id)}
        </button>

        <ul className="space-y-4">
          {plan.features.slice(0, 5).map((feature: string) => (
            <li key={feature} className="flex items-start gap-3">
              <Check size={18} className="mt-0.5 shrink-0 text-frame-orange" />
              <span className="text-sm font-light text-[var(--landing-subtle)]">{translatePlanText(feature, isEn)}</span>
            </li>
          ))}

          <AnimatePresence>
            {expandedPlan === plan.id && plan.features.slice(5).map((feature: string) => (
              <motion.li
                key={feature}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-3"
              >
                <Check size={18} className="mt-0.5 shrink-0 text-frame-orange" />
                <span className="text-sm font-light text-[var(--landing-subtle)]">{translatePlanText(feature, isEn)}</span>
              </motion.li>
            ))}
          </AnimatePresence>

          {plan.features.length > 5 && (
            <li className="pt-2">
              <button
                type="button"
                onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                className="flex min-h-11 items-center gap-2 text-sm text-frame-orange transition-colors hover:text-frame-orange/80"
                aria-expanded={expandedPlan === plan.id}
              >
                <span>{expandedPlan === plan.id ? (isEn ? "Show less" : "Ver menos") : (isEn ? "Show all features" : "Ver todas as features")}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${expandedPlan === plan.id ? "rotate-180" : ""}`}
                />
              </button>
            </li>
          )}
        </ul>
      </div>

      {plan.highlight && (
        <div className="absolute right-0 top-0 bg-frame-orange px-4 py-2 font-frame-mono text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-black">
          {t("app.landing.pricing.popular") as string}
        </div>
      )}
    </motion.article>
  );

  return (
    <section id="pricing" className="landing-section">
      <div className="landing-shell">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="landing-eyebrow mb-3">{t("app.landing.pricing.eyebrow") as string}</p>
          <h2 className="landing-heading mb-4 text-[clamp(2.8rem,5.5vw,5rem)]">
            {t("app.landing.pricing.heading") as string} <span className="landing-outline-text">{t("app.landing.pricing.outlineText") as string}</span>
          </h2>
          <p className="landing-copy mx-auto max-w-2xl">
            {t("app.landing.pricing.description") as string}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="pricing-core-plans"
        >
          {selfServePlans.map(renderPlan)}
        </motion.div>

        <div className="mt-14 border-t border-[var(--landing-line)] pt-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="landing-eyebrow mb-3">{t("app.landing.pricing.tailoredEyebrow") as string}</p>
              <h3 className="landing-heading text-[clamp(1.5rem,3vw,2.35rem)]">{t("app.landing.pricing.tailoredHeading") as string}</h3>
              <p className="landing-copy mt-3">{t("app.landing.pricing.tailoredCopy") as string}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowTailoredPlans((current) => !current)}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-white/20 px-4 text-sm font-medium text-white transition hover:border-frame-orange hover:text-frame-orange"
              aria-expanded={showTailoredPlans}
              aria-controls="pricing-tailored-plans"
              data-testid="pricing-tailored-toggle"
            >
              {t(showTailoredPlans ? "app.landing.pricing.tailoredHide" : "app.landing.pricing.tailoredShow") as string}
              <ChevronDown size={16} className={`transition-transform duration-200 ${showTailoredPlans ? "rotate-180" : ""}`} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {showTailoredPlans && (
              <motion.div
                id="pricing-tailored-plans"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2"
                data-testid="pricing-tailored-plans"
              >
                {tailoredPlans.map(renderPlan)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 text-center text-sm font-light text-[var(--landing-muted)]"
        >
          {t("app.landing.pricing.footnote") as string}
        </motion.p>
      </div>
    </section>
  );
}
