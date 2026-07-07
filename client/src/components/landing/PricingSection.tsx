import { PRICING } from "@shared/site";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { startCheckout } from "@/lib/api";
import { toStripePlanId } from "@/lib/plans";
import { motion } from "framer-motion";
import { Check, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// EN translations for plan descriptions and features from shared/site.ts (which is PT).
// Keyed by the original PT string. When locale === 'en', we look up the EN version.
const PLAN_TEXT_EN: Record<string, string> = {
  // Descriptions
  "Para freelancers validarem o fluxo com até 5 clientes": "For freelancers validating the workflow with up to 5 clients",
  "Para profissionais operarem até 15 clientes ativos": "For professionals running up to 15 active clients",
  "Para produtoras com equipe, 50 clientes e operação compartilhada":
    "For production companies with a team, 50 clients and shared operations",
  // ROI
  "💡 Economize 10h/mês em burocracia": "💡 Save 10h/month on paperwork",
  "🚀 Ganhe 20% mais capacidade operacional sem contratar": "🚀 Gain 20% more operational capacity without hiring",
  // Periods
  "/mês": "/mo",
  "/mês — mais popular": "/mo — most popular",
  "/mês — ativação após pagamento": "/mo — activated after payment",
  // Features - Free
  "5 gerações com IA/mês": "5 AI generations/month",
  "Acesso inicial às ferramentas": "Starter access to tools",
  "Export .txt": ".txt export",
  "Projetos para teste": "Test projects",
  "CRM básico de clientes": "Basic client CRM",
  "Até 5 clientes cadastrados": "Up to 5 registered clients",
  "Suporte por email": "Email support",
  // Features - Pro
  "15 clientes": "15 clients",
  "+ Clientes adicionais": "+ Additional clients",
  "100 gerações com IA/mês": "100 AI generations/month",
  "50 gerações com IA/mês": "50 AI generations/month",
  "Fluxos principais de produção": "Main production workflows",
  "Histórico completo": "Full history",
  "Export PDF e DOCX": "PDF and DOCX export",
  "Review de vídeos com anotações": "Video reviews with annotations",
  "CRM completo + pipeline": "Full CRM + pipeline",
  "Até 50 clientes cadastrados": "Up to 50 registered clients",
  "Suporte prioritário": "Priority support",
  // Features - Studio
  "50 clientes": "50 clients",
  "Tudo do Profissional": "Everything in Pro",
  "Gerações ilimitadas": "Unlimited generations",
  "Projetos e pastas": "Projects and folders",
  "Equipe e colaboradores": "Team and collaborators",
  "Arquivos e aprovações por projeto": "Files and approvals per project",
  "Relatórios operacionais": "Operational reports",
  "Clientes ilimitados após ativação": "Unlimited clients after activation",
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

  const handleSelectPlan = async (planId: string) => {
    if (planId === "iniciante") {
      setLocation("/register");
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
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {PRICING.map((plan, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -8 }}
              className={`landing-card relative overflow-hidden ${plan.highlight ? "md:scale-[1.03] border-frame-orange/70" : ""}`}
            >
              <div className="relative z-10 p-8 md:p-10">
                <div className="mb-4 font-frame-mono text-[0.64rem] uppercase tracking-[0.2em] text-frame-orange">
                  {plan.tier}
                </div>

                <div className="mb-2">
                  <span className="landing-heading text-[3.2rem]">
                    {plan.price}
                  </span>
                  <span className="ml-2 text-sm font-light text-[var(--landing-muted)]">{translatePlanText(plan.period, isEn)}</span>
                </div>

                <p className="mb-8 text-sm font-light leading-relaxed text-[var(--landing-muted)]">
                  {translatePlanText(plan.description, isEn)}
                </p>

                {/* ROI Badge */}
                {plan.roi && (
                  <div className="mb-6 inline-block rounded border border-frame-orange/30 bg-frame-orange/10 px-3 py-1.5">
                    <p className="text-xs font-medium text-frame-orange">{plan.roi}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void handleSelectPlan(plan.id)}
                  className={`w-full mb-8 flex items-center justify-center gap-2 ${
                    plan.highlight ? "frame-btn-primary" : "frame-btn-ghost"
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  {ctaLabel(plan.id)}
                </button>

                <ul className="space-y-4">
                  {plan.features.map((feature: string, fidx: number) => (
                    <li key={fidx} className="flex items-start gap-3">
                      <Check size={18} className="text-frame-orange flex-shrink-0 mt-0.5" />
                      <span className="text-sm font-light text-[var(--landing-subtle)]">{translatePlanText(feature, isEn)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.highlight && (
                <div className="absolute right-0 top-0 bg-frame-orange px-4 py-2 font-frame-mono text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-black">
                  {t("app.landing.pricing.popular") as string}
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>

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
