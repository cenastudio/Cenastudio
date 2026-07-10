import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import {
  FileText,
  Globe,
  Webhook,
  FolderOpen,
  Clapperboard,
  Clock,
  Calendar,
  Shield,
} from "lucide-react";

const NEW_FEATURES = [
  {
    icon: FileText,
    title: "Templates de Projeto",
    description: "Inicie novos projetos instantaneamente com templates profissionais pré-configurados",
    tag: "NOVO",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Globe,
    title: "Portal do Cliente",
    description: "Compartilhe progresso e receba aprovações através de um portal profissional e seguro",
    tag: "NOVO",
    gradient: "from-purple-500 to-pink-500",
  },
  {
    icon: Webhook,
    title: "Webhooks & Automação",
    description: "Integre com suas ferramentas favoritas e automatize fluxos de trabalho",
    tag: "NOVO",
    gradient: "from-orange-500 to-red-500",
  },
  {
    icon: FolderOpen,
    title: "Biblioteca de Assets",
    description: "50GB de armazenamento para seus arquivos, com busca inteligente e organização",
    tag: "NOVO",
    gradient: "from-green-500 to-emerald-500",
  },
  {
    icon: Clapperboard,
    title: "Shot List Profissional",
    description: "Planeje suas filmagens com drag-and-drop, cenas, takes e export para equipe",
    tag: "NOVO",
    gradient: "from-yellow-500 to-orange-500",
  },
  {
    icon: FileText,
    title: "Decupagem com IA",
    description: "Extraia automaticamente personagens, cenários e elementos do roteiro",
    tag: "NOVO",
    gradient: "from-indigo-500 to-purple-500",
  },
  {
    icon: Clock,
    title: "Timesheet Inteligente",
    description: "Controle horas trabalhadas por projeto com timer automático e relatórios",
    tag: "NOVO",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Calendar,
    title: "Google Calendar",
    description: "Sincronize cronogramas e deadlines automaticamente com seu calendário",
    tag: "NOVO",
    gradient: "from-teal-500 to-cyan-500",
  },
  {
    icon: Shield,
    title: "Gestão de Sessões",
    description: "Controle de segurança avançado com visualização e gerenciamento de acessos",
    tag: "NOVO",
    gradient: "from-red-500 to-orange-500",
  },
];

export default function WhatsNewSection() {
  const { t } = useLanguage();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <section className="landing-section relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-frame-orange/5 to-transparent pointer-events-none" />

      <div className="landing-shell relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full border border-frame-orange/30 bg-frame-orange/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-frame-orange opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-frame-orange" />
            </span>
            <span className="font-frame-mono text-[0.7rem] uppercase tracking-[0.2em] text-frame-orange">
              Atualização Julho 2026
            </span>
          </div>

          <h2 className="landing-heading text-[clamp(2.8rem,5.5vw,5rem)] mb-4">
            9 Novas <span className="landing-outline-text">Features</span>
          </h2>
          <p className="landing-copy mx-auto max-w-2xl">
            Implementamos funcionalidades críticas para profissionalizar ainda mais sua produção,
            desde templates até automação completa com webhooks e integrações.
          </p>
        </motion.div>

        {/* Grid de Features */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
        >
          {NEW_FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={cardVariants}
                whileHover={{ y: -4 }}
                className="landing-card group relative overflow-hidden p-6"
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon with gradient background */}
                  <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${feature.gradient} mb-4`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>

                  {/* Tag */}
                  <span className="inline-block mb-3 px-2 py-1 rounded text-[0.6rem] font-frame-mono uppercase tracking-wider bg-frame-orange/20 text-frame-orange border border-frame-orange/30">
                    {feature.tag}
                  </span>

                  {/* Title */}
                  <h3 className="landing-heading text-[1.4rem] mb-2 group-hover:text-frame-orange transition-colors">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[0.85rem] leading-relaxed text-[var(--landing-muted)]">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-[var(--landing-muted)] mb-4">
            Todas essas features já estão disponíveis nos planos Pro e Studio
          </p>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded border border-frame-orange/30 bg-frame-orange/10 text-frame-orange font-medium hover:bg-frame-orange/20 transition-colors"
          >
            Ver Planos
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
