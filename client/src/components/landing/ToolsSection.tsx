import { LANDING_TOOLS } from "@/shared/tools";
import { MARQUEE_ITEMS } from "@shared/site";
import { motion } from "framer-motion";

export default function ToolsSection() {
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
    <section id="tools" className="py-24 px-9 md:px-12 bg-frame-black">
      {/* Marquee — index_1 .mq */}
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] mb-16 w-screen overflow-hidden bg-frame-orange py-3">
        <div className="flex gap-10 animate-[marquee_22s_linear_infinite] whitespace-nowrap">
          {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
            <span
              key={i}
              className="font-frame-display text-[0.95rem] tracking-[0.13em] text-frame-black shrink-0"
            >
              {item}
              <span className="mx-5 opacity-30">◆</span>
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <p className="frame-label mb-3">// Ferramentas</p>
        <h2 className="frame-title text-[clamp(2.3rem,4.3vw,3.8rem)] text-frame-white mb-14">
          12 MÓDULOS <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">IA</em>
        </h2>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0.5"
        >
          {LANDING_TOOLS.map((tool) => (
            <motion.div key={tool.number} variants={cardVariants} className="frame-card group tool-card">
              <span className="text-[1.7rem] mb-3.5 block grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-300">
                {tool.icon}
              </span>
              <p className="font-frame-mono text-[0.64rem] tracking-[0.2em] text-frame-orange mb-2">
                {tool.number}
              </p>
              <h3 className="frame-title text-[1.45rem] text-frame-white mb-2">{tool.name}</h3>
              <p className="text-[0.8rem] leading-relaxed text-frame-gray-light font-light mb-4">
                {tool.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {tool.tags.map((tag: string) => (
                  <span key={tag} className="frame-tag">
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
