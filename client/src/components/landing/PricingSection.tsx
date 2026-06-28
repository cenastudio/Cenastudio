import { PRICING } from "@shared/site";
import { useAuth } from "@/contexts/AuthContext";
import { startCheckout } from "@/lib/api";
import { toStripePlanId } from "@/lib/plans";
import { motion } from "framer-motion";
import { Check, CreditCard } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function PricingSection() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  const handleSelectPlan = async (planId: string) => {
    if (planId === "iniciante") {
      setLocation("/register");
      return;
    }

    if (!isAuthenticated) {
      setLocation("/login");
      toast.message("Entre na sua conta para assinar com segurança.");
      return;
    }

    const stripePlanId = toStripePlanId(planId);
    if (!stripePlanId) {
      toast.error("Plano inválido.");
      return;
    }

    try {
      await startCheckout(stripePlanId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao iniciar checkout");
    }
  };

  const ctaLabel = (planId: string) => {
    if (planId === "iniciante") return "Começar grátis";
    return isAuthenticated ? "Assinar com Stripe" : "Entrar para assinar";
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
          <p className="landing-eyebrow mb-3">// Planos</p>
          <h2 className="landing-heading mb-4 text-[clamp(2.8rem,5.5vw,5rem)]">
            PLANOS <span className="landing-outline-text">SIMPLES</span>
          </h2>
          <p className="landing-copy mx-auto max-w-2xl">
            Escolha o plano perfeito para sua produção. Sem contratos, cancele quando quiser.
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
                  <span className="ml-2 text-sm font-light text-[var(--landing-muted)]">{plan.period}</span>
                </div>

                <p className="mb-8 text-sm font-light leading-relaxed text-[var(--landing-muted)]">
                  {plan.description}
                </p>

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
                      <span className="text-sm font-light text-[var(--landing-subtle)]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.highlight && (
                <div className="absolute right-0 top-0 bg-frame-orange px-4 py-2 font-frame-mono text-[0.64rem] font-semibold uppercase tracking-[0.15em] text-black">
                  Popular
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
          O plano Free é para validação inicial. Pro e Studio liberam os fluxos principais de produção, com diferenças em limite de uso, suporte e operação por projeto.
        </motion.p>
      </div>
    </section>
  );
}
