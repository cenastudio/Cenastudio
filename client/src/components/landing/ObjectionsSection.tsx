import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const OBJECTIONS_PT = [
  {
    question: "Já uso Drive + planilhas, por que mudar?",
    answer: "Importação automática de arquivos. Configure em 10 minutos e continue de onde parou.",
  },
  {
    question: "Minha equipe vai adotar?",
    answer: "Interface intuitiva feita para produtores. Treinamento incluso no plano Studio.",
  },
  {
    question: "E se eu precisar cancelar?",
    answer: "Export completo dos seus dados em PDF, DOCX e JSON. Sem lock-in, sem pegadinhas.",
  },
  {
    question: "Funciona para pequenas produtoras?",
    answer: "Sim! Plano Free permanente com 5 clientes. Upgrade só quando fizer sentido.",
  },
];

const OBJECTIONS_EN = [
  {
    question: "I already use Drive + spreadsheets, why change?",
    answer: "Automatic file import. Set up in 10 minutes and pick up where you left off.",
  },
  {
    question: "Will my team adopt it?",
    answer: "Intuitive interface made for producers. Training included in Studio plan.",
  },
  {
    question: "What if I need to cancel?",
    answer: "Full export of your data in PDF, DOCX and JSON. No lock-in, no tricks.",
  },
  {
    question: "Does it work for small production companies?",
    answer: "Yes! Permanent Free plan with 5 clients. Upgrade only when it makes sense.",
  },
];

export default function ObjectionsSection() {
  const { locale } = useLanguage();
  const isEn = locale === "en";
  const objections = isEn ? OBJECTIONS_EN : OBJECTIONS_PT;

  return (
    <section className="landing-section">
      <div className="landing-shell">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="landing-eyebrow mb-3">
            {isEn ? "// COMMON QUESTIONS" : "// DÚVIDAS COMUNS"}
          </p>
          <h2 className="landing-heading text-[clamp(2.8rem,5.5vw,5rem)] mb-4">
            {isEn ? (
              <>
                Questions we hear <span className="text-frame-orange">every day</span>
              </>
            ) : (
              <>
                Perguntas que ouvimos <span className="text-frame-orange">todo dia</span>
              </>
            )}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {objections.map((objection, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="landing-card p-6 hover:border-frame-orange/50 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-frame-orange/10 border border-frame-orange/30 flex items-center justify-center">
                  <span className="text-frame-orange text-xs font-bold">?</span>
                </div>
                <h3 className="text-base font-semibold text-frame-white">
                  {objection.question}
                </h3>
              </div>
              <div className="flex items-start gap-3 pl-9">
                <Check className="w-4 h-4 text-frame-orange flex-shrink-0 mt-0.5" />
                <p className="text-sm text-frame-gray-light leading-relaxed">
                  {objection.answer}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA final */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <p className="text-frame-gray-light mb-4">
            {isEn ? "Still have questions?" : "Ainda tem dúvidas?"}
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 text-frame-orange hover:text-frame-orange/80 transition font-medium"
          >
            {isEn ? "Talk to our team" : "Fale com nosso time"}
            <ArrowRight className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
