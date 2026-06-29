import { LANDING_TOOLS } from "@/shared/tools";
import { MARQUEE_ITEMS } from "@shared/site";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

export default function ToolsSection() {
  const { t } = useLanguage();
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
          {LANDING_TOOLS.map((tool) => (
            <motion.div key={tool.number} variants={cardVariants} className="landing-card group p-7">
              <span className="relative z-10 mb-3.5 block text-[1.7rem] grayscale brightness-75 transition-all duration-300 group-hover:grayscale-0 group-hover:brightness-100">
                {tool.icon}
              </span>
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
          ))}
        </motion.div>
      </div>
    </section>
  );
}
