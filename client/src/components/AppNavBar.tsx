import { useEffect, useRef, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { planDisplayLabel } from "@/lib/plans";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { LogOut, Sun, Moon, ChevronDown, Menu, X, Search } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import NotificationsPopover from "@/components/NotificationsPopover";
import BrandLogo from "@/components/BrandLogo";
import AccessibilityFontControls from "@/components/AccessibilityFontControls";

interface AppNavBarProps {
  children?: React.ReactNode;
}

export default function AppNavBar({ children }: AppNavBarProps) {
  const { logout, user, plan } = useAuth();
  const { openModal, selectPlan } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const close = (event: MouseEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) setMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [moreMenuOpen]);

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

  const isAdmin = user?.role === "admin";

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

  const navLink = (href: string, label: string) => {
    const active = location === href || location.startsWith(href + "/");
    return (
      <motion.button
        type="button"
        onClick={() => {
          setLocation(href);
          setMobileMenuOpen(false);
        }}
        className={`frame-nav-link ${active ? "active" : ""}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.button>
    );
  };

  const primaryNavItems = [
    ["/dashboard", "Painel"],
    ["/tools", "Studio IA"],
    ["/clients", "Clientes"],
    ["/pipeline", "Pipeline"],
    ["/video-reviews", "Aprovação"],
  ] as const;

  const secondaryNavItems = [
    ["/proposals", "Propostas"],
    ["/documents", "Docs"],
    ["/collaborators", "Equipe"],
    ["/analytics", "Analytics"],
    ["/company", "Empresa"],
    ...(isAdmin ? [["/admin", "Admin"]] as const : []),
  ] as const;

  return (
    <header className="frame-nav">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="xl:hidden flex h-9 w-9 items-center justify-center border border-frame-gray-3 text-frame-gray-light hover:text-frame-orange hover:border-frame-orange transition"
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
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
          aria-label="Voltar ao painel"
        >
          <BrandLogo compact className="scale-90 origin-left" />
        </button>
      </div>

      <nav className="hidden xl:flex items-center gap-4">
        {primaryNavItems.map(([href, label]) => (
          <span key={href}>{navLink(href, label)}</span>
        ))}
        <div ref={moreMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setMoreMenuOpen((open) => !open)}
            className={`frame-nav-link flex items-center gap-1.5 ${secondaryNavItems.some(([href]) => location === href || location.startsWith(href + "/")) ? "active" : ""}`}
            aria-expanded={moreMenuOpen}
          >
            Mais
            <ChevronDown className={`h-3 w-3 transition ${moreMenuOpen ? "rotate-180" : ""}`} />
          </button>
          {moreMenuOpen && (
            <div className="absolute left-0 top-[calc(100%+18px)] z-[700] w-48 border border-frame-gray-3 bg-frame-black p-2 shadow-2xl">
              {secondaryNavItems.map(([href, label]) => (
                <button
                  key={href}
                  type="button"
                  onClick={() => {
                    setLocation(href);
                    setMoreMenuOpen(false);
                  }}
                  className={`flex min-h-10 w-full items-center px-3 font-frame-mono text-[0.6rem] uppercase tracking-[0.1em] transition hover:bg-frame-gray-2 hover:text-frame-white ${
                    location === href || location.startsWith(href + "/") ? "text-frame-orange" : "text-frame-gray-light"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {user && (
          <button
            type="button"
            onClick={handleOpenCommandPalette}
            className="command-palette-trigger inline-flex"
            title="Buscar e navegar com Command + K"
            aria-label="Abrir busca"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd>⌘K</kbd>
          </button>
        )}
      </nav>

      <div className="flex items-center gap-2.5">
        {children}
        {user && (
          <button
            type="button"
            onClick={handleOpenCommandPalette}
            className="command-palette-trigger inline-flex xl:hidden"
            title="Buscar e navegar com Command + K"
            aria-label="Abrir busca"
          >
            <Search className="h-3.5 w-3.5" />
            <kbd className="hidden lg:inline">⌘K</kbd>
          </button>
        )}
        {user && (
          <button
            type="button"
            onClick={() => setLocation("/profile")}
            className="hidden sm:flex items-center gap-2.5 group"
            title="Abrir conta"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.75rem] font-bold shrink-0 transition group-hover:scale-105 ${
              isAdmin ? "bg-frame-gold text-frame-black" : "bg-frame-orange text-frame-black"
            }`}>
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <div className="font-frame-mono text-[0.6rem] tracking-[0.06em] text-frame-white truncate max-w-[100px]">
                {user?.name ?? user?.email}
              </div>
              <div className="font-frame-mono text-[0.62rem] tracking-[0.08em] text-frame-gray-light">
                {user?.email}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-frame-gray-light opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
        {user && <NotificationsPopover />}
        {user && <div className="hidden sm:block"><AccessibilityFontControls /></div>}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 border border-frame-gray-3 text-frame-gray-light hover:text-frame-orange hover:border-frame-orange transition rounded-none"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={handleBadgeClick} className="frame-badge hidden md:inline-flex">
          {planLabel}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="hidden sm:flex font-frame-mono text-[0.64rem] tracking-[0.09em] uppercase bg-transparent border border-frame-gray-3 text-frame-gray-light px-2.5 py-1.5 transition hover:border-frame-red hover:text-frame-red items-center gap-1.5"
        >
          <LogOut className="w-3 h-3" />
          Sair
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute left-0 right-0 top-full xl:hidden border-b border-frame-gray-2 bg-frame-black/98 backdrop-blur px-4 py-4 shadow-2xl">
          <nav className="grid grid-cols-2 gap-2">
            {[...primaryNavItems, ...secondaryNavItems].map(([href, label]) => (
              <span key={href} className="block">{navLink(href, label)}</span>
            ))}
          </nav>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => {
                setLocation("/profile");
                setMobileMenuOpen(false);
              }}
              className="min-h-10 border border-frame-gray-3 px-3 font-frame-mono text-[0.62rem] uppercase tracking-[0.1em] text-frame-gray-light"
            >
              Minha conta
            </button>
            <button
              type="button"
              onClick={handleBadgeClick}
              className="min-h-10 border border-frame-orange/50 px-3 font-frame-mono text-[0.62rem] uppercase tracking-[0.1em] text-frame-orange"
            >
              Plano {planLabel}
            </button>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase bg-transparent border border-frame-gray-3 text-frame-gray-light px-3 py-2.5 transition hover:border-frame-red hover:text-frame-red flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      )}
    </header>
  );
}
