import { LANDING_TOOLS } from "@/shared/tools";
import { MARQUEE_ITEMS } from "@shared/site";
import { useLanguage } from "@/contexts/LanguageContext";
import { localizeTools } from "@/lib/toolTranslations";
import { motion } from "framer-motion";
import {
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  Clapperboard,
  ClipboardList,
  FileText,
  Film,
  ListChecks,
  NotebookPen,
  PackageCheck,
  Palette,
  Sparkles,
  Wallet,
  Camera,
  Clock,
  Webhook,
  FolderOpen,
  Shield,
} from "lucide-react";

const TOOL_ICONS = [
  Film,
  Clapperboard,
  ClipboardList,
  Calculator,
  BriefcaseBusiness,
  FileText,
  NotebookPen,
  Palette,
  ListChecks,
  CalendarDays,
  PackageCheck,
  Sparkles,
];

/**
 * Operational features that live alongside the 12 AI tools but aren't
 * generation tools themselves (Budget, Equipment, Shot List, Timesheet,
 * Webhooks, Assets, Sessions). Rendered in the same grid so the landing
 * communicates "what you get" as one coherent set instead of splitting
 * "tools" and "what's new" into two separate, overlapping sections.
 */
interface OperationalFeature {
  icon: typeof Wallet;
  numberPt: string;
  namePt: string;
  descriptionPt: string;
  nameEn: string;
  descriptionEn: string;
  tagsPt: string[];
  tagsEn: string[];
}

const OPERATIONAL_FEATURES: OperationalFeature[] = [
  {
    icon: Wallet,
    numberPt: "13",
    namePt: "Orçamento",
    descriptionPt: "Defina o orçamento por categoria e lance gastos reais. Alertas automáticos quando uma categoria estoura.",
    nameEn: "Budget",
    descriptionEn: "Set a budget per category and log real spend. Automatic alerts when a category goes over.",
    tagsPt: ["Studio"],
    tagsEn: ["Studio"],
  },
  {
    icon: Camera,
    numberPt: "14",
    namePt: "Equipamento",
    descriptionPt: "Cadastre câmeras, lentes e acessórios. Reserve por projeto — conflitos de agenda são bloqueados automaticamente.",
    nameEn: "Equipment",
    descriptionEn: "Register cameras, lenses and accessories. Book per project — scheduling conflicts are blocked automatically.",
    tagsPt: ["Studio"],
    tagsEn: ["Studio"],
  },
  {
    icon: Clapperboard,
    numberPt: "15",
    namePt: "Shot List",
    descriptionPt: "Monte a lista de planos do projeto e reordene arrastando. Marque como filmado e exporte para a equipe.",
    nameEn: "Shot List",
    descriptionEn: "Build the project's shot list and reorder by dragging. Mark as shot and export for the crew.",
    tagsPt: ["Pro"],
    tagsEn: ["Pro"],
  },
  {
    icon: Clock,
    numberPt: "16",
    namePt: "Timesheet",
    descriptionPt: "Cronometre horas trabalhadas por projeto e calcule o custo real com base na taxa horária.",
    nameEn: "Timesheet",
    descriptionEn: "Track hours worked per project and calculate real cost based on hourly rate.",
    tagsPt: ["Pro"],
    tagsEn: ["Pro"],
  },
  {
    icon: Webhook,
    numberPt: "17",
    namePt: "Webhooks",
    descriptionPt: "Conecte o Cena a Slack, Zapier ou qualquer ferramenta via webhook — avisos automáticos quando algo acontece.",
    nameEn: "Webhooks",
    descriptionEn: "Connect Cena to Slack, Zapier or any tool via webhook — automatic alerts when something happens.",
    tagsPt: ["Pro+"],
    tagsEn: ["Pro+"],
  },
  {
    icon: FolderOpen,
    numberPt: "18",
    namePt: "Biblioteca de Assets",
    descriptionPt: "Todos os arquivos de todos os projetos numa biblioteca só, com busca e organização.",
    nameEn: "Asset Library",
    descriptionEn: "Every file from every project in one library, with search and organization.",
    tagsPt: ["Pro+"],
    tagsEn: ["Pro+"],
  },
];

export default function ToolsSection() {
  const { locale, t } = useLanguage();
  const isEn = locale === "en";
  const tools = localizeTools(
    LANDING_TOOLS.map((tool) => ({
      ...tool,
      id: tool.number,
      slug: tool.number,
      isActive: true,
      category: "",
      processingTime: "",
    })),
    locale,
  );
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.15 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section id="tools" className="landing-section overflow-hidden">
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mb-16 w-screen overflow-hidden border-y border-[var(--landing-line)] bg-[var(--landing-glass-soft)] py-3 backdrop-blur-xl">
        <div className="flex gap-10 animate-[marquee_22s_linear_infinite] whitespace-nowrap [animation-play-state:running] motion-reduce:animate-none">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span
              key={i}
              className="shrink-0 font-frame-display text-[0.95rem] tracking-[0.13em] text-[var(--landing-text)]"
            >
              {item}
              <span className="mx-5 text-frame-orange opacity-70">◆</span>
            </span>
          ))}
        </div>
      </div>

      <div className="landing-shell">
        <div className="mb-14 max-w-3xl">
          <p className="landing-eyebrow mb-3">{t("app.landing.toolsSection.eyebrow") as string}</p>
          <h2 className="landing-heading text-[clamp(2.8rem,5.5vw,5rem)]">
            {t("app.landing.toolsSection.heading") as string} <span className="landing-outline-text">{t("app.landing.toolsSection.outlineText") as string}</span>
          </h2>
          <p className="landing-copy mt-4 max-w-2xl">
            {t("app.landing.toolsSection.description") as string}
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
        >
          {tools.map((tool, index) => {
            const ToolIcon = TOOL_ICONS[index] ?? Sparkles;
            return (
            <motion.div key={tool.number} variants={cardVariants} className="landing-card group p-7">
              <ToolIcon className="relative z-10 mb-4 h-6 w-6 text-white/55 transition-colors group-hover:text-frame-orange" />
              <p className="relative z-10 mb-2 font-frame-mono text-[0.64rem] tracking-[0.2em] text-frame-orange">
                {tool.number}
              </p>
              <h3 className="landing-heading relative z-10 mb-2 text-[1.65rem]">{tool.name}</h3>
              <p className="relative z-10 mb-4 text-[0.85rem] font-light leading-relaxed text-[var(--landing-muted)]">
                {tool.description}
              </p>
              <div className="relative z-10 flex flex-wrap gap-1.5">
                {tool.tags.map((tag: string) => (
                  <span key={tag} className="landing-pill min-h-7 px-2.5 text-[0.52rem]">
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
            );
          })}
        </motion.div>

        {/* Operational features — same grid pattern, no separate "what's new" section
            (avoids the timestamp aging badly and the duplication of announcing features
            twice in two different sections). */}
        <div className="mt-16 mb-10 max-w-3xl">
          <p className="landing-eyebrow mb-3">{isEn ? "// OPERATION" : "// OPERAÇÃO"}</p>
          <h2 className="landing-heading text-[clamp(2.2rem,4.4vw,3.6rem)]">
            {isEn ? (
              <>Beyond AI: <span className="landing-outline-text">run the whole job</span></>
            ) : (
              <>Além da IA: <span className="landing-outline-text">rode o job inteiro</span></>
            )}
          </h2>
          <p className="landing-copy mt-4 max-w-2xl">
            {isEn
              ? "Budget, equipment, shot list, timesheet and automation — the operational layer that keeps the set running."
              : "Orçamento, equipamento, shot list, timesheet e automação — a camada operacional que mantém o set rodando."}
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3"
        >
          {OPERATIONAL_FEATURES.map((feature) => {
            const FeatureIcon = feature.icon;
            const tags = isEn ? feature.tagsEn : feature.tagsPt;
            return (
              <motion.div key={feature.numberPt} variants={cardVariants} className="landing-card group p-7">
                <FeatureIcon className="relative z-10 mb-4 h-6 w-6 text-white/55 transition-colors group-hover:text-frame-orange" />
                <p className="relative z-10 mb-2 font-frame-mono text-[0.64rem] tracking-[0.2em] text-frame-orange">
                  {feature.numberPt}
                </p>
                <h3 className="landing-heading relative z-10 mb-2 text-[1.65rem]">
                  {isEn ? feature.nameEn : feature.namePt}
                </h3>
                <p className="relative z-10 mb-4 text-[0.85rem] font-light leading-relaxed text-[var(--landing-muted)]">
                  {isEn ? feature.descriptionEn : feature.descriptionPt}
                </p>
                <div className="relative z-10 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className="landing-pill min-h-7 px-2.5 text-[0.52rem]">
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
