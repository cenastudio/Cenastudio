import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { planDisplayLabel } from "@/lib/plans";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { LogOut, Sun, Moon, Menu, X, Search, Film, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import NotificationsPopover from "@/components/NotificationsPopover";
import BrandLogo from "@/components/BrandLogo";
import AccessibilityFontControls from "@/components/AccessibilityFontControls";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useProject } from "@/contexts/ProjectContext";
import JourneyBreadcrumb from "@/components/JourneyBreadcrumb";

interface AppNavBarProps {
  children?: React.ReactNode;
}

export default function AppNavBar({ children }: AppNavBarProps) {
  const { logout, user, plan, isTeamMember } = useAuth();
  const { openModal, selectPlan } = useApp();
  const { theme, toggleTheme } = useTheme();
  const { t, locale } = useLanguage();
  const { projects, activeProject } = useProject();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on Esc key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileMenuOpen]);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new Event("cena:open-command-palette"));
  };

  const planLabel = plan
    ? planDisplayLabel(plan.planId, plan.planName, plan.status, plan.trialEndsAt)
    : "—";

  const routeProjectId = Number(location.match(/^\/project\/(\d+)/)?.[1] || 0);
  const contextProject = projects.find((project) => project.id === routeProjectId) || activeProject;

  const handleBadgeClick = () => {
    if (!plan) return;

    const isFreeOrTrial = plan.planId === "free" || plan.status === "trial";

    if (isFreeOrTrial) {
      selectPlan("produtora");
      openModal("checkout");
      return;
    }

    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Quero falar sobre meu plano Cena Studio.")}`,
      "_blank",
    );
  };

  const navLink = (href: string, label: string, _icon: string, tourId?: string, forceActive?: boolean) => {
    const active = forceActive ?? (location === href || location.startsWith(href + "/"));
    return (
      <motion.button
        type="button"
        onClick={() => {
          setLocation(href);
          setMobileMenuOpen(false);
        }}
        className={`frame-nav-link ${active ? "active" : ""}`}
        data-tour={tourId}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ minHeight: "44px" }}
      >
        <span className={`mr-1.5 text-[0.45rem] ${active ? "text-frame-orange" : "text-frame-gray-muted"}`}>●</span>
        {label}
      </motion.button>
    );
  };

  // Navigation follows the job story: Painel → Comercial → Produção → Financeiro
  const commercialRoutes = ["/commercial", "/clients", "/pipeline", "/interactions", "/proposals"];
  const productionRoutes = ["/projects", "/project/", "/tools", "/studio/", "/files", "/video-reviews", "/collaborators", "/documents", "/team"];
  const financeRoutes = ["/analytics", "/analytics-premium"];

  const isInCommercial = commercialRoutes.some((r) => location === r || location.startsWith(r + "/") || (r.endsWith("/") && location.startsWith(r)));
  const isInProduction = productionRoutes.some((r) => location === r || location.startsWith(r + "/") || (r.endsWith("/") && location.startsWith(r)));
  const isInFinance = financeRoutes.some((r) => location === r || location.startsWith(r + "/"));

  const primaryNavItems = (
    [
      ["/dashboard",  locale === "en" ? "PANEL"      : "PAINEL",     "●", "dashboard", location === "/dashboard" || location === "/home"],
      ["/commercial", locale === "en" ? "COMMERCIAL" : "COMERCIAL",  "●", "clients",   isInCommercial],
      ["/projects",   locale === "en" ? "PRODUCTION" : "PRODUÇÃO",   "●", "projects",  isInProduction],
      ["/analytics",  locale === "en" ? "FINANCE"    : "FINANCEIRO", "●", "analytics", isInFinance],
    ] as const
  ).filter(([path]) => {
    if (isTeamMember && (path === "/commercial" || path === "/analytics")) return false;
    return true;
  });

  return (
    <>
    <header className="frame-nav">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="xl:hidden flex h-11 w-11 items-center justify-center border border-frame-gray-3 text-frame-gray-light hover:text-frame-orange hover:border-frame-orange transition"
          aria-label={mobileMenuOpen ? t("app.nav.closeMenu") as string : t("app.nav.openMenu") as string}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setLocation("/dashboard");
            setMobileMenuOpen(false);
          }}
          className="bg-transparent border-none"
          aria-label={t("app.nav.backToDashboard") as string}
        >
          <BrandLogo compact className="scale-90 origin-left" />
        </button>
      </div>

      <nav className="hidden xl:flex items-center gap-4">
        {primaryNavItems.map(([href, label, icon, tourId, active]) => (
          <span key={href}>{navLink(href, label, icon, tourId, active as boolean)}</span>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {children}
        {/* JOB selector — compact chip with glass dropdown */}
        {user && contextProject && (
          <div className="hidden xl:block relative">
            <button
              type="button"
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="flex items-center gap-2.5 px-3 py-1.5 border border-frame-gray-3/60 bg-frame-gray-1/30 hover:border-frame-orange/50 hover:bg-frame-orange/[0.04] transition-all group rounded-sm"
              aria-label={t("app.nav.activeProject") as string}
            >
              <span className="w-5 h-5 flex items-center justify-center bg-frame-orange/15 border border-frame-orange/30 rounded-sm shrink-0">
                <Film className="w-3 h-3 text-frame-orange" />
              </span>
              <span className="flex flex-col items-start min-w-0 max-w-[150px]">
                <span className="text-[0.72rem] font-semibold text-frame-white truncate w-full leading-tight">{contextProject.name}</span>
                <span className="text-[0.58rem] text-frame-gray-light truncate w-full leading-tight">{contextProject.clientName || contextProject.status}</span>
              </span>
              <ChevronDown className={`w-3 h-3 text-frame-gray-light group-hover:text-frame-orange transition-transform ${projectDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Glass dropdown */}
            {projectDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProjectDropdownOpen(false)} />
                <div
                  className="absolute top-full right-0 mt-2 w-72 z-50 border border-frame-gray-3/60 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 project-dropdown-glass"
                >
                  <div className="px-3 py-2.5 border-b border-frame-gray-3/40">
                    <p className="font-frame-mono text-[0.55rem] uppercase tracking-[0.14em] text-frame-orange">{t("app.nav.activeProject")}</p>
                  </div>
                  <div className="max-h-[280px] overflow-y-auto py-1">
                    {projects.map((project) => {
                      const isActive = project.id === contextProject.id;
                      return (
                        <button
                          key={project.id}
                          type="button"
                          onClick={() => { setLocation(`/project/${project.id}`); setProjectDropdownOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-3 transition-colors ${
                            isActive
                              ? "bg-frame-orange/10 border-l-2 border-frame-orange"
                              : "hover:bg-frame-gray-2/50 border-l-2 border-transparent"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? "bg-frame-orange" : "bg-frame-gray-3"}`} />
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[0.75rem] font-medium truncate ${isActive ? "text-frame-orange" : "text-frame-white"}`}>{project.name}</span>
                            {project.clientName && (
                              <span className="block text-[0.6rem] text-frame-gray-light truncate">{project.clientName}</span>
                            )}
                          </span>
                          {isActive && <span className="text-[0.5rem] font-frame-mono text-frame-orange">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="px-3 py-2 border-t border-frame-gray-3/40">
                    <button
                      type="button"
                      onClick={() => { setLocation("/projects"); setProjectDropdownOpen(false); }}
                      className="w-full text-left text-[0.65rem] font-frame-mono text-frame-gray-light hover:text-frame-orange transition tracking-wider"
                    >
                      {t("app.hub.viewAll")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {/* Search */}
        {user && (
          <button
            type="button"
            onClick={handleOpenCommandPalette}
            className="command-palette-trigger inline-flex"
            title={t("app.nav.search") as string}
            aria-label={t("app.nav.openSearch") as string}
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="hidden lg:inline">⌘K</kbd>
          </button>
        )}
        {/* Notifications */}
        {user && <NotificationsPopover />}
        {/* Avatar + dropdown menu */}
        {user && (
          <div className="relative group">
            <button
              type="button"
              className="flex items-center gap-2 group"
              title={user.name ?? user.email}
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] font-bold shrink-0 transition group-hover:scale-105 bg-frame-orange text-frame-black">
                {(user.name ?? user.email).charAt(0).toUpperCase()}
              </div>
            </button>
            {/* Dropdown on hover */}
            <div className="absolute right-0 top-full mt-1 w-56 border border-frame-gray-3 bg-frame-black/98 backdrop-blur-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-3 border-b border-frame-gray-3">
                <p className="text-xs font-semibold text-frame-white truncate">{user.name ?? user.email}</p>
                <p className="text-[0.6rem] text-frame-gray-light truncate">{user.email}</p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button type="button" onClick={() => setLocation("/profile")} className="w-full text-left px-3 py-2 text-xs text-frame-gray-light hover:text-frame-white hover:bg-frame-gray-1/50 transition flex items-center gap-2">
                  {t("app.nav.myAccount") as string}
                </button>
                <button type="button" onClick={() => setLocation("/company")} className="w-full text-left px-3 py-2 text-xs text-frame-gray-light hover:text-frame-white hover:bg-frame-gray-1/50 transition flex items-center gap-2">
                  {locale === "en" ? "Configure studio" : "Configurar estúdio"}
                </button>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-frame-gray-light">Idioma</span>
                  <LanguageSwitcher compact />
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-frame-gray-light">Tema</span>
                  <button type="button" onClick={toggleTheme} className="text-frame-gray-light hover:text-frame-orange transition">
                    {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-frame-gray-light">Fonte</span>
                  <AccessibilityFontControls />
                </div>
              </div>
              <div className="p-1.5 border-t border-frame-gray-3">
                <button type="button" onClick={handleBadgeClick} className="w-full text-left px-3 py-2 text-xs text-frame-orange hover:bg-frame-orange/10 transition">
                  {planLabel}
                </button>
                <button type="button" onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs text-frame-gray-light hover:text-red-400 hover:bg-red-400/5 transition flex items-center gap-2">
                  <LogOut className="w-3 h-3" />
                  {t("app.nav.logout") as string}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Plan badge (visible when trial) */}
        {user && plan && (plan.status === "trial" || plan.planId === "free") && (
          <button type="button" onClick={handleBadgeClick} className="frame-badge hidden md:inline-flex">
            {planLabel}
          </button>
        )}
      </div>

      {/* Mobile menu with animations, backdrop, and accessibility features */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop with glass effect */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 top-[64px] z-[499] bg-black/30 backdrop-blur-sm xl:hidden"
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Mobile menu dropdown */}
            <motion.div
              ref={mobileMenuRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute left-0 right-0 top-full z-[500] xl:hidden border-b border-frame-gray-2 bg-frame-black/98 backdrop-blur-xl px-4 py-4 shadow-2xl"
            >
              {/* Primary navigation - story-driven */}
              <nav className="grid grid-cols-2 gap-2">
                {primaryNavItems.map(([href, label, icon, tourId, active]) => (
                  <span key={href} className="block">{navLink(href, label, icon, tourId, active as boolean)}</span>
                ))}
              </nav>

              {/* Additional mobile-only controls */}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
                <div className="min-h-[44px] border border-frame-gray-3 px-2 flex items-center justify-center">
                  <LanguageSwitcher compact />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLocation("/profile");
                    setMobileMenuOpen(false);
                  }}
                  className="min-h-[44px] border border-frame-gray-3 px-3 font-frame-mono text-[0.62rem] uppercase tracking-[0.1em] text-frame-gray-light hover:text-frame-orange hover:border-frame-orange transition"
                >
                  {t("app.nav.myAccount") as string}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 sm:hidden">
                <button
                  type="button"
                  onClick={handleBadgeClick}
                  className="min-h-[44px] border border-frame-orange/50 px-3 font-frame-mono text-[0.62rem] uppercase tracking-[0.1em] text-frame-orange hover:bg-frame-orange/10 transition"
                >
                  {t("app.nav.plan") as string} {planLabel}
                </button>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 w-full min-h-[44px] font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase bg-transparent border border-frame-gray-3 text-frame-gray-light px-3 py-2.5 transition hover:border-frame-red hover:text-frame-red flex items-center justify-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t("app.nav.logout") as string}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
    <JourneyBreadcrumb />
    </>
  );
}
