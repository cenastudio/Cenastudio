import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Minus, HelpCircle } from "lucide-react";

interface FAQ {
  question: string;
  answer: string;
}

const FAQS_PT: FAQ[] = [
  {
    question: "Preciso de cartão de crédito para começar?",
    answer: "Não! O plano Iniciante é 100% gratuito e não requer cartão de crédito. Você pode criar projetos, usar ferramentas de IA e explorar a plataforma sem compromisso.",
  },
  {
    question: "Como funciona o trial dos planos pagos?",
    answer: "Os planos Pro e Studio incluem 7 dias de trial gratuito. Durante o trial, você tem acesso completo a todas as features do plano. Cancele a qualquer momento antes do fim do trial sem cobranças.",
  },
  {
    question: "Posso cancelar meu plano a qualquer momento?",
    answer: "Sim! Você pode cancelar seu plano a qualquer momento. Não há contratos de longo prazo ou taxas de cancelamento. Seu acesso continua até o fim do período já pago.",
  },
  {
    question: "Quantos projetos posso criar?",
    answer: "O plano Iniciante permite 3 projetos ativos. Pro permite 15 projetos. Studio tem projetos ilimitados. Você pode arquivar projetos antigos para liberar espaço.",
  },
  {
    question: "As ferramentas de IA têm limite de uso?",
    answer: "Sim. Cada plano tem um número de gerações de IA por mês: Iniciante (50), Pro (500), Studio (2000). Gerações não utilizadas não acumulam para o próximo mês.",
  },
  {
    question: "Posso convidar colaboradores?",
    answer: "Sim! No plano Pro você pode ter até 3 colaboradores. No plano Studio, colaboradores são ilimitados. Cada colaborador tem login próprio e permissões configuráveis.",
  },
  {
    question: "Meus arquivos ficam seguros?",
    answer: "Absolutamente. Usamos Supabase Storage com criptografia em trânsito e em repouso. Backup automático diário. Você pode deletar seus dados a qualquer momento.",
  },
  {
    question: "Como funciona o suporte?",
    answer: "Plano Iniciante: FAQ e documentação. Plano Pro: email em até 24h. Plano Studio: email prioritário em até 4h + sessão de onboarding personalizada.",
  },
];

const FAQS_EN: FAQ[] = [
  {
    question: "Do I need a credit card to start?",
    answer: "No. The Starter plan is 100% free and does not require a credit card. You can create projects, use AI tools and explore the platform without any commitment.",
  },
  {
    question: "How does the trial for paid plans work?",
    answer: "The Pro and Studio plans include a 7-day free trial with full access to every feature. Cancel any time before the trial ends and you won't be charged.",
  },
  {
    question: "Can I cancel my plan at any time?",
    answer: "Yes. You can cancel any time. There are no long-term contracts or cancellation fees, and you keep access until the end of the period you already paid for.",
  },
  {
    question: "How many projects can I create?",
    answer: "The Starter plan allows 3 active projects. Pro allows 15 projects. Studio has unlimited projects. You can archive old projects to free up space.",
  },
  {
    question: "Do AI tools have usage limits?",
    answer: "Yes. Each plan includes a monthly AI generation quota: Starter (50), Pro (500), Studio (2000). Unused generations do not roll over to the next month.",
  },
  {
    question: "Can I invite collaborators?",
    answer: "Yes. The Pro plan supports up to 3 collaborators. The Studio plan has unlimited collaborators. Each collaborator gets their own login and configurable permissions.",
  },
  {
    question: "Are my files safe?",
    answer: "Absolutely. We use Supabase Storage with encryption in transit and at rest, plus automatic daily backups. You can delete your data at any time.",
  },
  {
    question: "How does support work?",
    answer: "Starter plan: FAQ and documentation. Pro plan: email within 24h. Studio plan: priority email within 4h plus a personalized onboarding session.",
  },
];

export default function FAQSection() {
  const { t, locale } = useLanguage();
  const isEn = locale === "en";
  const faqs = isEn ? FAQS_EN : FAQS_PT;
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="landing-section">
      <div className="landing-shell">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="frame-label mb-3">
            {isEn ? "// FREQUENTLY ASKED QUESTIONS" : "// PERGUNTAS FREQUENTES"}
          </p>
          <h2 className="frame-title text-[clamp(2.8rem,5.5vw,5rem)] mb-4">
            {isEn ? (
              <>
                Questions? <span className="text-frame-orange">Answered.</span>
              </>
            ) : (
              <>
                Dúvidas? <span className="text-frame-orange">Respondidas.</span>
              </>
            )}
          </h2>
          <p className="text-frame-gray-light text-lg max-w-2xl mx-auto">
            {isEn
              ? "Everything you need to know about the platform, plans and features."
              : "Tudo o que você precisa saber sobre a plataforma, planos e funcionalidades."}
          </p>
        </motion.div>

        {/* FAQ Grid */}
        <div className="max-w-4xl mx-auto">
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className={`border transition-all ${
                    isOpen
                      ? "border-frame-orange bg-frame-orange/5"
                      : "border-frame-gray-3 bg-frame-gray-1/5 hover:border-frame-gray-2"
                  }`}
                >
                  {/* Question */}
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full text-left p-6 flex items-start justify-between gap-4 group"
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div
                        className={`p-2 rounded transition ${
                          isOpen
                            ? "bg-frame-orange"
                            : "bg-frame-gray-2 group-hover:bg-frame-gray-3"
                        }`}
                      >
                        <HelpCircle
                          className={`w-4 h-4 ${isOpen ? "text-black" : "text-frame-orange"}`}
                        />
                      </div>
                      <h3
                        className={`text-base font-semibold transition ${
                          isOpen ? "text-frame-orange" : "text-frame-white"
                        }`}
                      >
                        {faq.question}
                      </h3>
                    </div>

                    {/* Toggle Icon */}
                    <motion.div
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: 0.2 }}
                      className={`p-2 rounded transition ${
                        isOpen ? "bg-frame-orange" : "bg-frame-gray-2"
                      }`}
                    >
                      <Plus className={`w-4 h-4 ${isOpen ? "text-black" : "text-frame-white"}`} />
                    </motion.div>
                  </button>

                  {/* Answer */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6 pl-[4.5rem]">
                          <p className="text-sm text-frame-gray-light leading-relaxed">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* CTA Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-12 text-center border border-frame-gray-3 bg-frame-gray-1/5 p-8"
          >
            <h3 className="text-xl font-semibold text-frame-white mb-3">
              {isEn ? "Still have questions?" : "Ainda tem dúvidas?"}
            </h3>
            <p className="text-frame-gray-light mb-6">
              {isEn
                ? "Our team is ready to help. Get in touch!"
                : "Nossa equipe está pronta para te ajudar. Fale com a gente!"}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="#contact"
                className="frame-btn-primary"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector("#site-footer")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {isEn ? "Talk to Support" : "Falar com Suporte"}
              </a>
              <a
                href="/register"
                className="frame-btn-ghost"
              >
                {isEn ? "Try for Free" : "Testar Grátis"}
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
