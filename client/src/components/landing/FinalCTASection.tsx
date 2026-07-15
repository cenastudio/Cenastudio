import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { ArrowRight, Sparkles, Zap, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FinalCTASection() {
  const [, setLocation] = useLocation();
  const { locale } = useLanguage();
  const isEn = locale === "en";

  const benefits = isEn
    ? ["Free to start", "No credit card required", "Cancel anytime"]
    : ["Grátis para começar", "Sem cartão necessário", "Cancele quando quiser"];

  return (
    <section className="landing-section relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-frame-orange/5 to-transparent pointer-events-none" />

      <div className="landing-shell relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 0.6 }}
            className="inline-flex p-4 mb-6 bg-frame-orange/10 border border-frame-orange/30 rounded-full"
          >
            <Sparkles className="w-8 h-8 text-frame-orange" />
          </motion.div>

          {/* Heading */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="landing-heading text-[clamp(2.8rem,5.5vw,5rem)] mb-6"
          >
            {isEn ? (
              <>
                Ready to{" "}
                <span className="text-frame-orange">transform</span>
                <br />
                your workflow?
              </>
            ) : (
              <>
                Pronto para{" "}
                <span className="text-frame-orange">transformar</span>
                <br />
                seu workflow?
              </>
            )}
          </motion.h2>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-frame-gray-light text-lg mb-8 max-w-2xl mx-auto"
          >
            {isEn
              ? "14 days free, full access. See if it fits your workflow before you decide."
              : "14 dias grátis, com acesso completo. Veja se encaixa no seu fluxo antes de decidir."}
          </motion.p>

          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 mb-10"
          >
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="flex items-center gap-2 px-4 py-2 border border-frame-gray-3 bg-frame-gray-1/10 backdrop-blur-xl"
              >
                <CheckCircle2 className="w-4 h-4 text-frame-orange" />
                <span className="text-sm text-frame-white">{benefit}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLocation("/register")}
              className="frame-btn-primary text-lg px-8 py-4 flex items-center justify-center gap-3 group"
            >
              <Zap className="w-5 h-5" />
              {isEn ? "Start for free" : "Começar Gratuitamente"}
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                document.querySelector("#product-proof")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="frame-btn-ghost text-lg px-8 py-4"
            >
              {isEn ? "See it in action" : "Ver Demonstração"}
            </motion.button>
          </motion.div>

        </motion.div>

        {/* Decorative Elements — pulse continuously while the section is in
            view; revert to hidden only when scrolled out (viewport once:
            false), so it never fades away on its own while visible. */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: [0.1, 0.18, 0.1], scale: [1, 1.04, 1] }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{
            opacity: { delay: 0.7, duration: 3.2, repeat: Infinity, ease: "easeInOut" },
            scale: { delay: 0.7, duration: 3.2, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-frame-orange/20 pointer-events-none"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: [0.05, 0.12, 0.05], scale: [1, 1.03, 1] }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{
            opacity: { delay: 0.9, duration: 3.6, repeat: Infinity, ease: "easeInOut" },
            scale: { delay: 0.9, duration: 3.6, repeat: Infinity, ease: "easeInOut" },
          }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-frame-orange/10 pointer-events-none"
        />
      </div>
    </section>
  );
}
