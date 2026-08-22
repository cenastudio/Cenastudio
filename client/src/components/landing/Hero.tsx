import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Play } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";

const highlightKeys = [
  "app.landing.hero.highlightCommercial",
  "app.landing.hero.highlightProduction",
  "app.landing.hero.highlightClient",
] as const;

const heroScenes = [
  {
    id: "dashboard",
    image: "/landing/product/dashboard.png",
  },
  {
    id: "project",
    image: "/landing/product/project-hub.png",
  },
  {
    id: "studio",
    image: "/landing/product/studio.png",
  },
] as const;

export default function Hero() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const activeScene = heroScenes[activeSceneIndex];

  useEffect(() => {
    if (prefersReducedMotion) return undefined;

    const interval = window.setInterval(() => {
      setActiveSceneIndex((current) => (current + 1) % heroScenes.length);
    }, 6400);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <section className="landing-hero landing-hero-product relative overflow-hidden">
      <div className="landing-hero-product-image" aria-hidden="true">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeScene.id}
            src={activeScene.image}
            data-scene={activeScene.id}
            alt=""
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 1.025 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.992 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.85, ease: "easeOut" }}
            fetchPriority="high"
          />
        </AnimatePresence>
      </div>
      <div className="landing-hero-product-scrim" aria-hidden="true" />

      <div className="landing-shell relative z-10 flex min-h-[min(760px,calc(100svh-32px))] items-end pb-10 pt-28 sm:pb-14 lg:items-center lg:pb-12 lg:pt-24">
        <div className="max-w-[620px]">
          <p className="landing-eyebrow mb-5">{t("app.landing.hero.eyebrow") as string}</p>

          <h1 className="landing-hero-title text-[clamp(2.8rem,4.6vw,5rem)]">
            {t("app.landing.hero.titleLead") as string}{" "}
            <span className="text-frame-orange">{t("app.landing.hero.titleAccent") as string}</span>
          </h1>

          <p className="mt-6 max-w-[540px] text-[0.98rem] leading-relaxed text-white/82 sm:text-lg">
            {t("app.landing.hero.description") as string}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setLocation("/login")}
              data-testid="landing-hero-primary-cta"
              className="landing-hero-cta inline-flex min-h-12 items-center justify-center gap-3 bg-frame-orange px-5 text-sm font-semibold text-black transition hover:bg-frame-orange/90"
            >
              {t("app.landing.hero.cta") as string}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => document.querySelector("#product-proof")?.scrollIntoView({ behavior: "smooth" })}
              data-testid="landing-hero-product-cta"
              className="landing-hero-secondary-cta inline-flex min-h-12 items-center justify-center gap-2 border border-white/30 bg-black/35 px-5 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-black/55"
            >
              <Play className="h-3.5 w-3.5" aria-hidden="true" />
              {t("app.landing.hero.exploreProduct") as string}
            </button>
          </div>

          <ul className="mt-7 hidden gap-2.5 text-sm text-white/78 sm:grid sm:grid-cols-3 sm:gap-4" aria-label={t("app.landing.hero.highlightsLabel") as string}>
            {highlightKeys.map((key) => (
              <li key={key} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-frame-orange" aria-hidden="true" />
                <span>{t(key) as string}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

    </section>
  );
}
