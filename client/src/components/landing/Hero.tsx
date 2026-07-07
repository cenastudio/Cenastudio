import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { ArrowRight, MonitorPlay, Play, CircleDot } from "lucide-react";

function HeroTitleLine({ children }: { children: string }) {
  // Destaca última palavra em laranja
  const words = children.trim().split(" ");
  if (words.length === 0) return <span>{children}</span>;

  const lastWord = words[words.length - 1];
  const before = words.slice(0, -1).join(" ");

  return (
    <span>
      {before}{before && " "}
      <em className="bg-gradient-to-r from-frame-orange via-amber-400 to-frame-orange/70 bg-clip-text text-transparent">
        {lastWord}
      </em>
    </span>
  );
}

export default function Hero() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <section className="landing-hero landing-hero-clean relative min-h-[calc(100svh-32px)] overflow-hidden">
      <div className="landing-hero-light absolute inset-0" />
      <div className="landing-shell relative z-10 grid min-h-[calc(100svh-32px)] grid-cols-1 items-center gap-6 pb-8 pt-24 lg:grid-cols-[0.94fr_1.06fr] lg:gap-10 lg:pb-10 lg:pt-24">
        <div className="max-w-[690px]">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-black/20 backdrop-blur-xl">
              <MonitorPlay className="h-4 w-4 text-white" />
            </span>
            <p className="max-w-[220px] text-[0.68rem] leading-relaxed text-white/70">
              {t("app.landing.hero.subtitle") as string}
            </p>
          </div>

          {/* Slogan em destaque */}
          <div className="mb-6">
            <p className="inline-block font-frame-mono text-[0.72rem] uppercase tracking-[0.18em] text-frame-orange bg-frame-orange/10 border border-frame-orange/30 px-4 py-2">
              ✦ {t("app.landing.hero.filmmakers") as string}
            </p>
          </div>

          <h1 className="landing-hero-title text-[clamp(3.4rem,6.2vw,6.5rem)] font-light leading-[0.95] tracking-tight">
            <HeroTitleLine>{t("app.landing.hero.titleLine1") as string}</HeroTitleLine>
            <br />
            <HeroTitleLine>{t("app.landing.hero.titleLine2") as string}</HeroTitleLine>
            {" "}
            <HeroTitleLine>{t("app.landing.hero.titleLine3") as string}</HeroTitleLine>
          </h1>

          <p className="mt-5 max-w-[500px] text-[0.94rem] leading-relaxed text-white/72 sm:text-base">
            {t("app.landing.hero.description") as string}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setLocation("/login")}
              className="landing-hero-cta group inline-flex min-h-12 items-center justify-between gap-8 bg-frame-orange px-5 text-sm font-medium text-black"
            >
              {t("app.landing.hero.cta") as string}
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white transition-transform group-hover:translate-x-1">
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => document.querySelector("#product-proof")?.scrollIntoView({ behavior: "smooth" })}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-white/20 bg-black/20 px-5 text-sm text-white backdrop-blur-xl transition hover:border-white/40 hover:bg-white/10"
            >
              <Play className="h-3.5 w-3.5" />
              {t("app.landing.hero.watchProduct") as string}
            </button>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:hidden">
            {[
              { number: t("app.landing.hero.stat1Number"), label: t("app.landing.hero.stat1Label") },
              { number: t("app.landing.hero.stat2Number"), label: t("app.landing.hero.stat2Label") },
              { number: t("app.landing.hero.stat3Number"), label: t("app.landing.hero.stat3Label") },
            ].map((stat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm font-bold text-frame-orange">{stat.number}</span>
                <span className="text-xs text-white/66">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 hidden items-center gap-3 sm:flex">
            <div className="flex -space-x-2" aria-hidden="true">
              {["D", "P", "F"].map((letter, index) => (
                <span
                  key={letter}
                  className="grid h-8 w-8 place-items-center rounded-full border border-white/30 text-[0.6rem] font-medium text-white"
                  style={{ background: index === 1 ? "var(--color-frame-orange)" : "rgba(20, 12, 8, 0.82)" }}
                >
                  {letter}
                </span>
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {[
                { number: t("app.landing.hero.stat1Number"), label: t("app.landing.hero.stat1Label") },
                { number: t("app.landing.hero.stat2Number"), label: t("app.landing.hero.stat2Label") },
                { number: t("app.landing.hero.stat3Number"), label: t("app.landing.hero.stat3Label") },
              ].map((stat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-sm font-bold text-frame-orange">{stat.number}</span>
                  <span className="text-xs text-white/66">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="landing-system-stage relative">
          <div className="landing-system-preview landing-glass-strong">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-frame-orange" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              </div>
              <p className="font-frame-mono text-[0.56rem] uppercase tracking-[0.16em] text-white/48">
                {t("app.landing.hero.realProduct") as string}
              </p>
            </div>
            <img
              src="/landing/product/project-hub.png"
              alt="Tela real do centro de projeto no Cena Studio"
              className="block w-full object-cover object-top"
              fetchPriority="high"
            />
          </div>

          <div className="landing-system-card landing-glass hidden sm:block">
            <p className="mb-3 font-frame-mono text-[0.54rem] uppercase tracking-[0.16em] text-frame-orange">
              {t("app.landing.hero.reviewProduction") as string}
            </p>
            <img
              src="/landing/product/studio.png"
              alt="Tela real do Studio IA no Cena Studio"
              className="block w-full object-cover object-top"
              loading="lazy"
            />
          </div>
        </div>

        <div className="absolute bottom-10 right-0 hidden items-center gap-3 font-frame-mono text-[0.54rem] uppercase tracking-[0.16em] text-white/45 xl:flex">
          <CircleDot className="h-3 w-3 text-frame-orange" />
          {t("app.landing.hero.branding") as string}
        </div>
      </div>
    </section>
  );
}
