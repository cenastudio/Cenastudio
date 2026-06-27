import { HERO } from "@shared/site";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";

/**
 * Hero Section Component
 * Design: Cinematográfico com efeito de reel de filme, gradiente radial
 * Animações: Fade-in sequencial, hover effects nos botões
 * Tipografia: Bebas Neue para títulos (display), DM Sans para corpo
 */
export default function Hero() {
  const [, setLocation] = useLocation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  };

  return (
    <section className="relative min-h-[96vh] flex flex-col justify-end pb-16 sm:pb-20 pt-32 px-6 sm:px-9 md:px-12 overflow-hidden border-b border-frame-gray-3">
      <img
        src="/landing/product/project-hub.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover object-[62%_center] opacity-35"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#000_0%,rgba(0,0,0,0.92)_34%,rgba(0,0,0,0.58)_72%,rgba(0,0,0,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_30%_62%,rgba(255,77,0,0.2)_0%,rgba(0,0,0,0)_55%)]" />

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 max-w-3xl"
      >
        {/* Tag */}
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-2 mb-6"
        >
          <span className="font-frame-mono text-[0.65rem] tracking-[0.2em] uppercase text-frame-orange animate-pulse">
            ▶
          </span>
          <span className="font-frame-mono text-[0.65rem] tracking-[0.2em] uppercase text-frame-orange">
            {(HERO as any).tag}
          </span>
        </motion.div>

        {/* Title */}
        <motion.div variants={itemVariants} className="mb-8">
          <h1
            className="frame-title text-[clamp(4.1rem,10vw,9rem)] leading-[0.88] tracking-[0.02em] max-w-[980px]"
          >
            {(HERO as any).title[0]}
            <br />
            <span className="text-frame-orange sm:ml-16">{(HERO as any).title[1]}</span>
            <br />
            <span
              className="text-transparent"
              style={{
                WebkitTextStroke: "2px #f5f0e8",
              }}
            >
              {(HERO as any).title[2]}
            </span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="text-[1rem] leading-relaxed text-frame-gray-light mb-10 max-w-xl font-light"
        >
          {(HERO as any).subtitle}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={itemVariants} className="flex gap-4 items-center flex-wrap">
          <motion.button
            onClick={() => setLocation("/login")}
            className="frame-btn-primary"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            {(HERO as any).cta.primary.label}
          </motion.button>

          <motion.button
            onClick={() => document.querySelector("#product-proof")?.scrollIntoView({ behavior: "smooth" })}
            className="frame-btn-ghost flex items-center gap-2"
            whileHover={{ x: 4 }}
          >
            {(HERO as any).cta.secondary.label}
            <ChevronRight size={16} />
          </motion.button>
        </motion.div>
      </motion.div>
    </section>
  );
}
