import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { planDisplayLabel } from "@/lib/plans";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { LogOut, Sun, Moon, ChevronDown, Menu, X } from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import NotificationsPopover from "@/components/NotificationsPopover";

interface AppNavBarProps {
  children?: React.ReactNode;
}

export default function AppNavBar({ children }: AppNavBarProps) {
  const { logout, user, plan } = useAuth();
  const { openModal, selectPlan } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
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
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Quero falar sobre meu plano FRAME.AI Director.")}`,
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

  const navItems = (
    <>
      {navLink("/dashboard", "Painel")}
      {navLink("/tools", "Ferramentas")}
      {navLink("/clients", "Clientes")}
      {navLink("/pipeline", "Pipeline")}
      {navLink("/proposals", "Propostas")}
      {navLink("/documents", "Docs")}
      {navLink("/company", "Empresa")}
      {navLink("/files", "Arquivos")}
      {navLink("/video-reviews", "Aprovação")}
      {navLink("/collaborators", "Equipe")}
      {navLink("/analytics", "Analytics")}
      {isAdmin && navLink("/admin", "Admin")}
    </>
  );

  return (
    <header className="frame-nav">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="md:hidden p-2 border border-frame-gray-3 text-frame-gray-light hover:text-frame-orange hover:border-frame-orange transition rounded-none"
          aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <button
          type="button"
          onClick={() => {
            setLocation("/tools");
            setMobileMenuOpen(false);
          }}
          className="font-frame-display text-[1.35rem] md:text-[1.55rem] tracking-[0.1em] text-frame-white bg-transparent border-none"
        >
          FRAME<span className="text-frame-orange">.</span>AI
        </button>
      </div>

      <nav className="hidden md:flex items-center gap-5">
        {navItems}
      </nav>

      <div className="flex items-center gap-2.5">
        {children}
        {user && (
          <button
            type="button"
            onClick={() => setLocation("/profile")}
            className="flex items-center gap-2.5 group"
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
              <div className="font-frame-mono text-[0.5rem] tracking-[0.08em] text-frame-gray-light">
                {user?.email}
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-frame-gray-light opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}
        {user && <NotificationsPopover />}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 border border-frame-gray-3 text-frame-gray-light hover:text-frame-orange hover:border-frame-orange transition rounded-none"
          title={theme === "dark" ? "Modo claro" : "Modo escuro"}
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
        <button type="button" onClick={handleBadgeClick} className="frame-badge">
          {planLabel}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className="hidden sm:flex font-frame-mono text-[0.58rem] tracking-[0.09em] uppercase bg-transparent border border-frame-gray-3 text-frame-gray-light px-2.5 py-1.5 transition hover:border-frame-red hover:text-frame-red items-center gap-1.5"
        >
          <LogOut className="w-3 h-3" />
          Sair
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="absolute left-0 right-0 top-full md:hidden border-b border-frame-gray-2 bg-frame-black/98 backdrop-blur px-4 py-4 shadow-2xl">
          <nav className="grid grid-cols-2 gap-2">
            {navItems}
          </nav>
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
