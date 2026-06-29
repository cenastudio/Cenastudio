import { SITE_CONFIG } from "@shared/site";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { ArrowUpRight, BadgeCheck, LockKeyhole, Receipt, ShieldCheck } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function Footer() {
  const { t } = useLanguage();
  const currentYear = new Date().getFullYear();
  const trustItems = [
    { icon: LockKeyhole, labelKey: "app.landing.footer.secureCheckout" },
    { icon: ShieldCheck, labelKey: "app.landing.footer.dataProtected" },
    { icon: Receipt, labelKey: "app.landing.footer.clearPlans" },
  ];
  const footerSections = [
    {
      titleKey: "app.landing.footer.platform",
      links: [
        ["app.landing.footer.realProduct", "#product-proof"],
        ["app.landing.footer.studioIA", "#tools"],
        ["app.landing.footer.files", "#tools"],
        ["app.landing.footer.videoReview", "#tools"],
      ],
    },
    {
      titleKey: "app.landing.footer.operation",
      links: [
        ["app.landing.footer.about", "#about"],
        ["app.landing.footer.flow", "#about"],
        ["app.landing.footer.pricing", "#pricing"],
        ["app.landing.footer.contact", "#contact"],
      ],
    },
    {
      titleKey: "app.landing.footer.legal",
      links: [
        ["app.landing.footer.terms", "#"],
        ["app.landing.footer.privacy", "#"],
        ["app.landing.footer.cookies", "#"],
      ],
    },
    {
      titleKey: "app.landing.footer.support",
      links: [
        ["app.landing.footer.scheduleDemoLink", "#contact"],
        ["app.landing.footer.productCenter", "#product-proof"],
        ["app.landing.footer.plans", "#pricing"],
        ["app.landing.footer.login", "/login"],
      ],
    },
  ] as const;

  return (
    <footer id="site-footer" className="landing-section pb-10">
      <div className="landing-shell space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="landing-glass-strong grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[1.05fr_0.95fr]"
        >
          <div>
            <p className="landing-eyebrow mb-4">{t("app.landing.footer.eyebrow")}</p>
            <h2 className="landing-heading max-w-3xl text-[clamp(3rem,6.2vw,6.4rem)] leading-[0.92]">
              <span className="block">{t("app.landing.footer.headingLine1")}</span>
              <span className="block">{t("app.landing.footer.headingLine2")}</span>
              <span className="block text-frame-orange">{t("app.landing.footer.headingLine3")}</span>
            </h2>
          </div>

          <div className="flex flex-col justify-between gap-6 lg:items-end lg:text-right">
            <p className="landing-copy max-w-xl text-[1.05rem] leading-relaxed lg:pt-4">
              {t("app.landing.footer.copy")}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:justify-items-end">
              {trustItems.map(({ icon: Icon, labelKey }) => (
                <span key={labelKey} className="landing-pill justify-center">
                  <Icon className="h-3.5 w-3.5 text-frame-orange" />
                  {t(labelKey)}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-12 border-b border-[var(--landing-line)] pb-10 lg:grid-cols-[0.95fr_1.6fr]">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <a href="/" className="mb-6 inline-block">
              <BrandLogo tone="onDark" className="text-2xl" />
            </a>
            <p className="max-w-md text-[0.92rem] font-light leading-relaxed text-[var(--landing-muted)]">
              {t("app.landing.footer.description")}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="/login"
                className="inline-flex items-center gap-2 border border-frame-orange bg-frame-orange px-4 py-2.5 font-frame-mono text-[0.64rem] uppercase tracking-[0.14em] text-black transition hover:bg-frame-orange-dark"
              >
                {t("app.landing.footer.enterProduct")}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 border border-[var(--landing-line)] px-4 py-2.5 font-frame-mono text-[0.64rem] uppercase tracking-[0.14em] text-[var(--landing-muted)] transition hover:border-frame-orange/40 hover:text-[var(--landing-text)]"
              >
                {t("app.landing.footer.scheduleDemo")}
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-4"
          >
            {footerSections.map((section) => (
              <div key={section.titleKey}>
                <h4 className="mb-5 font-frame-mono text-[0.64rem] uppercase tracking-[0.2em] text-frame-orange">
                  {t(section.titleKey)}
                </h4>
                <ul className="space-y-3">
                  {section.links.map(([labelKey, href]) => (
                    <li key={`${href}-${labelKey}`}>
                      <a
                        href={href}
                        className="text-[0.9rem] text-[var(--landing-muted)] transition-colors hover:text-[var(--landing-text)]"
                      >
                        {t(labelKey)}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col justify-between gap-5 font-frame-mono text-[0.64rem] tracking-[0.08em] text-[var(--landing-muted)] lg:flex-row"
        >
          <div className="max-w-2xl leading-relaxed space-y-2">
            <div>© {currentYear} {SITE_CONFIG.title}. {t("app.landing.footer.allRightsReserved")}</div>
            <div>{t("app.landing.footer.license")}</div>
            <div>{t("app.landing.footer.legalNotice")}</div>
          </div>
          <div className="flex items-center gap-2 text-[var(--landing-subtle)]">
            <BadgeCheck className="w-3.5 h-3.5 text-frame-orange" />
            {t("app.landing.footer.madeBy")}
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
