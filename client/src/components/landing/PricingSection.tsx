import { PRICING } from "@shared/site";
import { motion } from "framer-motion";
import { Check, MessageCircle } from "lucide-react";
import { useLocation } from "wouter";
import { WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from "@/lib/constants";

export default function PricingSection() {
  const [, setLocation] = useLocation();

  const handleSelectPlan = (planId: string, planLabel: string) => {
    if (planId === "iniciante") {
      setLocation("/register");
      return;
    }

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      WHATSAPP_MESSAGE(planLabel),
    )}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const ctaLabel = (planId: string) => {
    if (planId === "iniciante") return "Começar grátis";
    return "Falar com consultor";
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
    <section id="pricing" className="py-24 px-9 md:px-12 bg-frame-black">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="frame-label mb-3">// Planos</p>
          <h2 className="frame-title text-[clamp(2.3rem,4.3vw,3.8rem)] text-frame-white mb-4">
            PLANOS <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">SIMPLES</em>
          </h2>
          <p className="text-frame-gray-light text-[0.93rem] font-light max-w-2xl mx-auto leading-relaxed">
            Escolha o plano perfeito para sua produção. Sem contratos, cancele quando quiser.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {PRICING.map((plan, idx) => (
            <motion.div
              key={idx}
              variants={cardVariants}
              whileHover={{ y: -8 }}
              className={`relative overflow-hidden transition-all duration-300 border ${
                plan.highlight
                  ? "md:scale-105 bg-frame-orange/10 border-frame-orange"
                  : "bg-frame-gray-2 border-transparent hover:border-frame-gray-3"
              }`}
            >
              <div className="p-8 md:p-10">
                <div className="font-frame-mono text-[0.58rem] tracking-[0.2em] uppercase text-frame-orange mb-4">
                  {plan.tier}
                </div>

                <div className="mb-2">
                  <span className="frame-title text-[3rem] text-frame-white">
                    {plan.price}
                  </span>
                  <span className="text-frame-gray-light text-sm ml-2 font-light">{plan.period}</span>
                </div>

                <p className="text-frame-gray-light text-sm mb-8 font-light leading-relaxed">
                  {plan.description}
                </p>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.id, plan.tier)}
                  className={`w-full mb-8 flex items-center justify-center gap-2 ${
                    plan.highlight ? "frame-btn-primary" : "frame-btn-ghost"
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  {ctaLabel(plan.id)}
                </button>

                <ul className="space-y-4">
                  {plan.features.map((feature: string, fidx: number) => (
                    <li key={fidx} className="flex items-start gap-3">
                      <Check size={18} className="text-frame-orange flex-shrink-0 mt-0.5" />
                      <span className="text-frame-cream text-sm font-light">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {plan.highlight && (
                <div className="absolute top-0 right-0 bg-frame-orange text-frame-black px-4 py-2 font-frame-mono text-[0.56rem] uppercase tracking-[0.15em] font-semibold">
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
          className="text-center text-frame-gray-muted text-sm mt-12 font-light"
        >
          Todos os planos incluem acesso a todas as ferramentas. Diferenças apenas em limite de uso e suporte.
        </motion.p>
      </div>
    </section>
  );
}
