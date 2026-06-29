import { NAVIGATION, SITE_CONFIG } from "@shared/site";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navigation() {
  const [, setLocation] = useLocation();
  const { openModal } = useApp();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const handleNavClick = (href: string) => {
    if (href.startsWith("#")) {
      const id = href.substring(1);
      const element = document.getElementById(id);
      if (element) element.scrollIntoView({ behavior: "smooth" });
    } else {
      setLocation(href);
    }
    setOpen(false);
  };

  const handleContact = () => {
    openModal("contact");
    setOpen(false);
  };

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-4 py-5 sm:px-6 lg:py-7">
      <div className="landing-shell flex min-h-12 items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="border-none bg-transparent"
          aria-label={SITE_CONFIG.title}
        >
          <BrandLogo tone="onDark" />
        </button>

        <div className="hidden items-center gap-1 rounded-md border border-white/15 bg-black/30 p-1 shadow-2xl backdrop-blur-2xl lg:flex">
          {NAVIGATION.map((link) => (
            <button
              key={`${link.href}-${link.label}`}
              type="button"
              onClick={() => {
                if (link.href === "#contact") handleContact();
                else handleNavClick(link.href);
              }}
              className="min-h-8 rounded px-3 text-[0.68rem] text-white/65 transition-colors hover:bg-white/8 hover:text-white"
            >
              {t(link.label as string) as string}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <LanguageSwitcher compact />
          <button
            type="button"
            onClick={() => setLocation("/login")}
            className="min-h-10 px-4 text-xs text-white/70 transition hover:text-white"
          >
            {t("login") as string}
          </button>
          <button
            type="button"
            onClick={() => setLocation("/register")}
            className="min-h-10 rounded-md bg-[#f9f9f9] px-5 text-xs font-medium text-black transition hover:bg-white"
          >
            {t("start") as string}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="grid h-10 w-10 place-items-center rounded-md border border-white/15 bg-black/30 text-white backdrop-blur-xl sm:hidden"
          aria-label={open ? (t("closeMenu") as string) : (t("openMenu") as string)}
          aria-expanded={open}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="landing-shell mt-2 grid gap-1 rounded-md border border-white/15 bg-black/85 p-2 shadow-2xl backdrop-blur-2xl sm:hidden"
        >
          {NAVIGATION.map((link) => (
            <button
              key={`${link.href}-${link.label}`}
              type="button"
              onClick={() => {
                if (link.href === "#contact") handleContact();
                else handleNavClick(link.href);
              }}
              className="min-h-11 px-3 text-left font-frame-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--landing-muted)] hover:text-[var(--landing-text)]"
            >
              {t(link.label as string) as string}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setLocation("/login")}
            className="min-h-11 px-3 text-left font-frame-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--color-frame-orange)]"
          >
            {t("login") as string}
          </button>
        </motion.div>
      )}
    </nav>
  );
}
