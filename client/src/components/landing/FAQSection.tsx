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
    question: "Já uso Drive + planilhas, por que mudar?",
    answer: "Porque cliente, projeto, arquivo e aprovação ficam no mesmo lugar — sem alternar entre 4 ferramentas para achar uma informação. Você pode importar seus dados atuais e continuar de onde parou.",
  },
  {
    question: "Preciso de cartão de crédito para começar?",
    answer: "Não. O plano Free é gratuito e não pede cartão. Você cria projetos, usa as ferramentas de IA e testa a plataforma sem compromisso.",
  },
  {
    question: "Como funciona o trial dos planos pagos?",
    answer: "Pro e Studio têm 14 dias de trial gratuito com acesso completo ao plano. Cancele antes do fim do trial e não é cobrado nada.",
  },
  {
    question: "E se eu precisar cancelar depois?",
    answer: "Cancele quando quiser, sem contrato de longo prazo ou taxa de cancelamento. Seus dados continuam exportáveis (PDF, DOCX) mesmo depois do cancelamento.",
  },
  {
    question: "Quantos clientes posso cadastrar?",
    answer: "Free permite até 5 clientes ativos, Pro até 15, Studio até 50. Você pode arquivar clientes antigos para liberar espaço.",
  },
  {
    question: "As ferramentas de IA têm limite de uso?",
    answer: "Sim — cada plano tem um número de gerações de IA por mês: Free (5), Pro (100), Studio (ilimitado). Gerações não usadas não acumulam para o mês seguinte.",
  },
  {
    question: "Posso convidar colaboradores ou equipe?",
    answer: "No plano Studio você pode ter até 5 membros de equipe com login próprio e permissões configuráveis, além de cadastrar equipe externa (freelancers) sem limite.",
  },
  {
    question: "Meus arquivos ficam seguros?",
    answer: "Sim. Armazenamento com criptografia em trânsito e em repouso, backup automático. Você pode deletar seus dados quando quiser.",
  },
];

const FAQS_EN: FAQ[] = [
  {
    question: "I already use Drive + spreadsheets, why change?",
    answer: "Because clients, projects, files and approvals live in one place — no switching between 4 tools to find one piece of information. You can import your current data and pick up where you left off.",
  },
  {
    question: "Do I need a credit card to start?",
    answer: "No. The Free plan is free and doesn't require a card. You can create projects, use AI tools and explore the platform without any commitment.",
  },
  {
    question: "How does the trial for paid plans work?",
    answer: "Pro and Studio include a 14-day free trial with full access to the plan. Cancel before the trial ends and you won't be charged.",
  },
  {
    question: "What if I need to cancel later?",
    answer: "Cancel any time, no long-term contract or cancellation fee. Your data stays exportable (PDF, DOCX) even after cancelling.",
  },
  {
    question: "How many clients can I register?",
    answer: "Free allows up to 5 active clients, Pro up to 15, Studio up to 50. You can archive old clients to free up space.",
  },
  {
    question: "Do AI tools have usage limits?",
    answer: "Yes — each plan includes a monthly AI generation quota: Free (5), Pro (100), Studio (unlimited). Unused generations don't roll over to the next month.",
  },
  {
    question: "Can I invite collaborators or team members?",
    answer: "The Studio plan supports up to 5 team members with their own login and configurable permissions, plus unlimited external crew (freelancers).",
  },
  {
    question: "Are my files safe?",
    answer: "Yes. Storage with encryption in transit and at rest, automatic backups. You can delete your data whenever you want.",
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
          <p className="landing-eyebrow mb-3">
            {isEn ? "// FREQUENTLY ASKED QUESTIONS" : "// PERGUNTAS FREQUENTES"}
          </p>
          <h2 className="landing-heading text-[clamp(2.8rem,5.5vw,5rem)] mb-4">
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
