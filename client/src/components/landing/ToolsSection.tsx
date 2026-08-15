import { useState } from "react";
import { LANDING_TOOLS } from "@/shared/tools";
import { useLanguage } from "@/contexts/LanguageContext";
import { localizeTools } from "@/lib/toolTranslations";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  ClipboardList,
  FileText,
  Film,
  ListChecks,
  NotebookPen,
  PackageCheck,
  Palette,
  Sparkles,
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

interface OperatingArea {
  icon: LucideIcon;
  titleKey: string;
  descriptionKey: string;
  modulesKey: string;
}

const OPERATING_AREAS: OperatingArea[] = [
  {
    icon: BriefcaseBusiness,
    titleKey: "app.landing.operatingAreas.commercial.title",
    descriptionKey: "app.landing.operatingAreas.commercial.description",
    modulesKey: "app.landing.operatingAreas.commercial.modules",
  },
  {
    icon: Clapperboard,
    titleKey: "app.landing.operatingAreas.production.title",
    descriptionKey: "app.landing.operatingAreas.production.description",
    modulesKey: "app.landing.operatingAreas.production.modules",
  },
  {
    icon: FileText,
    titleKey: "app.landing.operatingAreas.delivery.title",
    descriptionKey: "app.landing.operatingAreas.delivery.description",
    modulesKey: "app.landing.operatingAreas.delivery.modules",
  },
];

export default function ToolsSection() {
  const { locale, t } = useLanguage();
  const [showAiTools, setShowAiTools] = useState(false);
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
      <div className="landing-shell">
        <header className="mb-14 max-w-3xl">
          <p className="landing-eyebrow mb-3">{t("app.landing.operatingAreas.eyebrow") as string}</p>
          <h2 className="landing-heading text-[clamp(2.8rem,5.5vw,5rem)]">
            {t("app.landing.operatingAreas.heading") as string}{" "}
            <span className="landing-outline-text">{t("app.landing.operatingAreas.outlineText") as string}</span>
          </h2>
          <p className="landing-copy mt-4 max-w-2xl">{t("app.landing.operatingAreas.copy") as string}</p>
        </header>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 gap-3 md:grid-cols-3"
        >
          {OPERATING_AREAS.map((area) => {
            const AreaIcon = area.icon;
            return (
              <motion.article key={area.titleKey} variants={cardVariants} className="landing-card group p-7">
                <AreaIcon className="relative z-10 mb-5 h-6 w-6 text-white/55 transition-colors group-hover:text-frame-orange" aria-hidden="true" />
                <h3 className="landing-heading relative z-10 mb-3 text-[1.65rem]">{t(area.titleKey) as string}</h3>
                <p className="relative z-10 text-[0.9rem] font-light leading-relaxed text-[var(--landing-muted)]">
                  {t(area.descriptionKey) as string}
                </p>
                <p className="relative z-10 mt-5 font-frame-mono text-[0.62rem] leading-relaxed tracking-[0.12em] text-frame-orange">
                  {t(area.modulesKey) as string}
                </p>
              </motion.article>
            );
          })}
        </motion.div>

        <div className="landing-tool-catalog mt-14 border border-[var(--landing-line)] bg-[var(--landing-glass-soft)] p-5 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="landing-eyebrow mb-3">{t("app.landing.aiCatalog.eyebrow") as string}</p>
              <h3 className="landing-heading text-[clamp(1.8rem,3.6vw,3rem)]">{t("app.landing.aiCatalog.heading") as string}</h3>
              <p className="landing-copy mt-3">{t("app.landing.aiCatalog.copy") as string}</p>
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 border border-white/25 px-4 text-sm font-medium text-white transition hover:border-frame-orange hover:text-frame-orange"
              onClick={() => setShowAiTools((current) => !current)}
              aria-expanded={showAiTools}
              aria-controls="landing-ai-tools"
              data-testid="landing-ai-tools-toggle"
            >
              {t(showAiTools ? "app.landing.aiCatalog.hide" : "app.landing.aiCatalog.show") as string}
              {showAiTools ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>

          {showAiTools && (
            <motion.div
              id="landing-ai-tools"
              data-testid="landing-ai-tools"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
            >
              {tools.map((tool, index) => {
                const ToolIcon = TOOL_ICONS[index] ?? Sparkles;
                return (
                  <motion.article key={tool.number} variants={cardVariants} className="border border-[var(--landing-line)] bg-black/20 p-5">
                    <ToolIcon className="mb-4 h-5 w-5 text-frame-orange" aria-hidden="true" />
                    <h4 className="landing-heading text-[1.25rem]">{tool.name}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">{tool.description}</p>
                  </motion.article>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
