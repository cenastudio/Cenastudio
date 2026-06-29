import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import Navigation from "@/components/landing/Navigation";
import PricingSection from "@/components/landing/PricingSection";
import ToolsSection from "@/components/landing/ToolsSection";
import { CheckoutModal } from "@/components/landing/modals/CheckoutModal";
import { ContactModal } from "@/components/landing/modals/ContactModal";
import { DemoModal } from "@/components/landing/modals/DemoModal";
import { motion } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";

import {
  Users, BarChart3, GitBranch, Film,
  MessageSquare, FolderOpen, CheckCircle, ArrowRight,
} from "lucide-react";

function useLandingContent() {
  const { t } = useLanguage();

  const PLATFORM_HIGHLIGHTS = [
    {
      icon: Film,
      title: t("landing.highlights.iaStudio.title") as string,
      items: [
        t("landing.highlights.iaStudio.item1") as string,
        t("landing.highlights.iaStudio.item2") as string,
        t("landing.highlights.iaStudio.item3") as string,
        t("landing.highlights.iaStudio.item4") as string,
        t("landing.highlights.iaStudio.item5") as string,
      ],
    },
    {
      icon: FolderOpen,
      title: t("landing.highlights.files.title") as string,
      items: [
        t("landing.highlights.files.item1") as string,
        t("landing.highlights.files.item2") as string,
        t("landing.highlights.files.item3") as string,
        t("landing.highlights.files.item4") as string,
        t("landing.highlights.files.item5") as string,
      ],
    },
    {
      icon: MessageSquare,
      title: t("landing.highlights.videoReview.title") as string,
      items: [
        t("landing.highlights.videoReview.item1") as string,
        t("landing.highlights.videoReview.item2") as string,
        t("landing.highlights.videoReview.item3") as string,
        t("landing.highlights.videoReview.item4") as string,
        t("landing.highlights.videoReview.item5") as string,
      ],
    },
    {
      icon: Users,
      title: t("landing.highlights.crm.title") as string,
      items: [
        t("landing.highlights.crm.item1") as string,
        t("landing.highlights.crm.item2") as string,
        t("landing.highlights.crm.item3") as string,
        t("landing.highlights.crm.item4") as string,
        t("landing.highlights.crm.item5") as string,
      ],
    },
    {
      icon: BarChart3,
      title: t("landing.highlights.operation.title") as string,
      items: [
        t("landing.highlights.operation.item1") as string,
        t("landing.highlights.operation.item2") as string,
        t("landing.highlights.operation.item3") as string,
        t("landing.highlights.operation.item4") as string,
        t("landing.highlights.operation.item5") as string,
      ],
    },
    {
      icon: GitBranch,
      title: t("landing.highlights.pipeline.title") as string,
      items: [
        t("landing.highlights.pipeline.item1") as string,
        t("landing.highlights.pipeline.item2") as string,
        t("landing.highlights.pipeline.item3") as string,
        t("landing.highlights.pipeline.item4") as string,
        t("landing.highlights.pipeline.item5") as string,
      ],
    },
  ];

  const PLATFORM_FLOW = [
    { step: "01", title: t("landing.flow.step1.title") as string, desc: t("landing.flow.step1.desc") as string },
    { step: "02", title: t("landing.flow.step2.title") as string, desc: t("landing.flow.step2.desc") as string },
    { step: "03", title: t("landing.flow.step3.title") as string, desc: t("landing.flow.step3.desc") as string },
    { step: "04", title: t("landing.flow.step4.title") as string, desc: t("landing.flow.step4.desc") as string },
    { step: "05", title: t("landing.flow.step5.title") as string, desc: t("landing.flow.step5.desc") as string },
    { step: "06", title: t("landing.flow.step6.title") as string, desc: t("landing.flow.step6.desc") as string },
  ];

  const PRODUCT_SCREENS = [
    {
      label: t("landing.screens.dashboard.label") as string,
      title: t("landing.screens.dashboard.title") as string,
      description: t("landing.screens.dashboard.desc") as string,
      image: "/landing/product/dashboard.png",
    },
    {
      label: t("landing.screens.projectHub.label") as string,
      title: t("landing.screens.projectHub.title") as string,
      description: t("landing.screens.projectHub.desc") as string,
      image: "/landing/product/project-hub.png",
    },
    {
      label: t("landing.screens.studio.label") as string,
      title: t("landing.screens.studio.title") as string,
      description: t("landing.screens.studio.desc") as string,
      image: "/landing/product/studio.png",
    },
  ];

  const USE_CASES = [
    {
      title: t("landing.useCases.freelancers.title") as string,
      description: t("landing.useCases.freelancers.desc") as string,
    },
    {
      title: t("landing.useCases.smallStudios.title") as string,
      description: t("landing.useCases.smallStudios.desc") as string,
    },
    {
      title: t("landing.useCases.agencies.title") as string,
      description: t("landing.useCases.agencies.desc") as string,
    },
  ];

  return { PLATFORM_HIGHLIGHTS, PLATFORM_FLOW, PRODUCT_SCREENS, USE_CASES };
}

function ProductProofSection() {
  const { t } = useLanguage();
  const { PRODUCT_SCREENS, USE_CASES } = useLandingContent();

  return (
    <section id="product-proof" className="landing-section">
      <div className="landing-shell space-y-16">
        <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="landing-eyebrow mb-3">// {t("landing.proof.eyebrow") as string}</p>
            <h2
              className="landing-heading mb-5 text-[clamp(2.8rem,6vw,5.7rem)]"
              dangerouslySetInnerHTML={{
                __html: t("landing.proof.heading") as string,
              }}
            />
            <p className="landing-copy max-w-xl">{t("landing.proof.copy") as string}</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="landing-glass grid grid-cols-1 sm:grid-cols-3"
          >
            {[
              t("landing.proof.step1") as string,
              t("landing.proof.step2") as string,
              t("landing.proof.step3") as string,
            ].map((step, index) => (
              <div key={step} className="border-b border-[var(--landing-line)] p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                <span className="mb-3 block font-frame-mono text-[0.62rem] uppercase tracking-[0.16em] text-frame-orange">
                  0{index + 1}
                </span>
                <p className="text-sm font-medium leading-snug text-[var(--landing-text)]">{step}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="space-y-8">
          {PRODUCT_SCREENS.map((screen, index) => (
            <motion.article
              key={screen.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: index * 0.08 }}
              className="landing-card grid grid-cols-1 items-center gap-6 p-4 sm:p-6 lg:grid-cols-[340px_1fr] lg:gap-10"
            >
              <div className="relative z-10 space-y-3">
                <p className="font-frame-mono text-[0.64rem] uppercase tracking-[0.18em] text-frame-orange">
                  {screen.label}
                </p>
                <h3 className="text-2xl font-semibold text-[var(--landing-text)]">{screen.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--landing-muted)]">{screen.description}</p>
              </div>

              <div className="relative z-10 overflow-hidden border border-[var(--landing-line)] bg-[var(--landing-glass-soft)]">
                <img
                  src={screen.image}
                  alt={`${screen.title} no Cena Studio`}
                  loading="lazy"
                  className="block w-full aspect-[16/9] object-cover object-top"
                />
              </div>
            </motion.article>
          ))}
        </div>

        <div>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <p className="landing-eyebrow mb-3">// {t("landing.useCases.eyebrow") as string}</p>
              <h2
                className="landing-heading text-[clamp(2.4rem,4.5vw,4rem)]"
                dangerouslySetInnerHTML={{
                  __html: t("landing.useCases.heading") as string,
                }}
              />
            </div>
            <p className="max-w-md text-sm leading-relaxed text-[var(--landing-muted)]">
              {t("landing.useCases.copy") as string}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {USE_CASES.map((useCase) => (
              <div key={useCase.title} className="landing-card p-6">
                <h3 className="relative z-10 mb-2 text-lg font-semibold text-[var(--landing-text)]">{useCase.title}</h3>
                <p className="relative z-10 text-sm leading-relaxed text-[var(--landing-muted)]">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Landing() {
  const { openModal, modals } = useApp();
  const { t } = useLanguage();
  const { PLATFORM_HIGHLIGHTS, PLATFORM_FLOW } = useLandingContent();

  return (
    <div className="cena-landing min-h-screen overflow-x-hidden">
      <Navigation />
      <Hero />
      <ProductProofSection />
      <ToolsSection />

      {/* About Section */}
      <section id="about" className="landing-section">
        <div className="landing-shell">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <p className="landing-eyebrow mb-3">// {t("landing.about.eyebrow") as string}</p>
            <h2 className="landing-heading mb-4 text-[clamp(2.8rem,5.5vw,5rem)]">
              {t("landing.about.title.part1") as string}{" "}
              <span className="landing-outline-text">{t("landing.about.title.highlight") as string}</span>
            </h2>
            <p className="landing-copy max-w-2xl">{t("landing.about.copy") as string}</p>
          </motion.div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_HIGHLIGHTS.map((section, idx) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className="landing-card group p-6"
                >
                  <div className="relative z-10 mb-5 flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center border border-[var(--landing-line)] bg-[var(--landing-glass-soft)] transition group-hover:border-frame-orange/40">
                      <Icon className="w-5 h-5 text-frame-orange" />
                    </div>
                    <h3 className="text-lg font-bold text-[var(--landing-text)]">{section.title}</h3>
                  </div>
                  <ul className="relative z-10 space-y-2">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-[var(--landing-muted)]">
                        <CheckCircle className="w-3.5 h-3.5 text-frame-orange shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="landing-section">
        <div className="landing-shell">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="landing-eyebrow mb-3">// {t("landing.workflow.eyebrow") as string}</p>
            <h2
              className="landing-heading mb-4 text-[clamp(2.8rem,5.5vw,5rem)]"
              dangerouslySetInnerHTML={{
                __html: t("landing.workflow.heading") as string,
              }}
            />
            <p className="landing-copy mx-auto max-w-2xl">{t("landing.workflow.copy") as string}</p>
          </motion.div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_FLOW.map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="landing-card group p-6"
              >
                <span className="relative z-10 text-[2.5rem] font-bold text-frame-orange/40 transition group-hover:text-frame-orange">
                  {item.step}
                </span>
                <h3 className="relative z-10 mt-2 mb-1 text-lg font-bold text-[var(--landing-text)]">{item.title}</h3>
                <p className="relative z-10 text-sm text-[var(--landing-muted)]">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <button
              onClick={() => openModal("demo")}
              className="frame-btn-primary inline-flex items-center gap-2"
            >
              {t("landing.seePlatform") as string} <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      <PricingSection />

      {/* Contact Section */}
      <section id="contact" className="landing-section">
        <div className="landing-shell">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden border border-[var(--landing-line)] bg-[rgba(10,7,6,0.78)] px-5 py-6 shadow-[0_28px_120px_rgba(0,0,0,0.42)] sm:px-8 sm:py-8 lg:px-10"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,78,0,0.18),transparent_32%),radial-gradient(circle_at_86%_80%,rgba(255,78,0,0.10),transparent_34%)]" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-frame-orange/50 to-transparent" aria-hidden="true" />

            <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
              <div className="flex min-h-[360px] flex-col justify-between border border-[var(--landing-line)] bg-black/20 p-6 sm:p-8">
                <div>
                  <p className="landing-eyebrow mb-5">{t("landing.contact.eyebrow") as string}</p>
                  <h2
                    className="landing-heading max-w-3xl text-[clamp(3.1rem,6.5vw,6.8rem)] leading-[0.9]"
                    dangerouslySetInnerHTML={{ __html: t("landing.contact.heading") as string }}
                  />
                  <p className="landing-copy mt-6 max-w-2xl text-[1.05rem] leading-relaxed">
                    {t("landing.contact.copy") as string}
                  </p>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    ["01", t("landing.contact.badgeDemo") as string],
                    ["02", t("landing.contact.badgeOps") as string],
                    ["03", t("landing.contact.badgeReply") as string],
                  ].map(([number, label]) => (
                    <div key={number} className="border border-[var(--landing-line)] bg-black/20 p-3">
                      <p className="font-frame-mono text-[0.58rem] tracking-[0.18em] text-frame-orange">{number}</p>
                      <p className="mt-2 text-xs leading-relaxed text-[var(--landing-muted)]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="border border-frame-orange/35 bg-frame-orange/[0.08] p-5 sm:p-6">
                  <p className="font-frame-mono text-[0.62rem] uppercase tracking-[0.2em] text-frame-orange">
                    {t("landing.contact.ctaLabel") as string}
                  </p>
                  <p className="mt-3 text-2xl font-light leading-tight text-[var(--landing-text)]">
                    {t("landing.contact.ctaTitle") as string}
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    <button
                      onClick={() => openModal("contact")}
                      className="frame-btn-primary inline-flex w-full items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      {t("landing.contact.sendMessage") as string}
                    </button>
                    <button
                      onClick={() => openModal("demo")}
                      className="frame-btn-ghost inline-flex w-full items-center justify-center gap-2"
                    >
                      {t("landing.contact.scheduleDemo") as string} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {[
                  [t("landing.contact.emailLabel") as string, "contato@cenastudio.com.br", t("landing.contact.emailHint") as string],
                  [t("landing.contact.supportLabel") as string, "suporte@cenastudio.com.br", t("landing.contact.supportHint") as string],
                  [t("landing.contact.hoursLabel") as string, t("landing.contact.hoursValue") as string, t("landing.contact.hoursHint") as string],
                ].map(([label, value, hint]) => (
                  <div key={label} className="group border border-[var(--landing-line)] bg-black/18 p-5 transition hover:border-frame-orange/45 hover:bg-frame-orange/[0.04]">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-frame-mono text-[0.62rem] uppercase tracking-[0.2em] text-frame-orange">{label}</p>
                        <p className="mt-3 text-base text-[var(--landing-text)]">{value}</p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--landing-muted)]">{hint}</p>
                      </div>
                      <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-frame-orange opacity-60 transition group-hover:opacity-100" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
      {modals.contact && <ContactModal />}
      {modals.checkout && <CheckoutModal />}
      {modals.demo && <DemoModal />}
    </div>
  );
}
