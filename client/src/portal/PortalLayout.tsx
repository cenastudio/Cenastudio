import { useEffect } from "react";
import { useLocation } from "wouter";
import { CalendarDays, FileCheck2, Files, FolderKanban, LogOut, UserRound } from "lucide-react";
import { usePortalAuth } from "./PortalAuthContext";

const NAV_ITEMS = [
  { href: "/portal/dashboard", label: "Projetos", icon: FolderKanban, stage: "01" },
  { href: "/portal/files", label: "Arquivos", icon: Files, stage: "02" },
  { href: "/portal/proposals", label: "Propostas", icon: FileCheck2, stage: "03" },
  { href: "/portal/meetings", label: "Reuniões", icon: CalendarDays, stage: "04" },
  { href: "/portal/account", label: "Conta", icon: UserRound, stage: "05" },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { client, logout } = usePortalAuth();
  const [location, setLocation] = useLocation();
  const activeItem = NAV_ITEMS.find((item) => location === item.href) || NAV_ITEMS[0];
  const ActiveIcon = activeItem.icon;

  // O portal não usa ThemeContext (contexto isolado da produtora),
  // mas precisa do tema dark para os tokens frame-* funcionarem.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.dataset.theme = "dark";
    return () => {
      // Ao sair do portal, respeitar o tema salvo pelo usuário da produtora.
      const stored = localStorage.getItem("theme") ?? "dark";
      root.classList.toggle("dark", stored === "dark");
      root.classList.toggle("light", stored === "light");
      root.dataset.theme = stored;
    };
  }, []);

  async function handleLogout() {
    await logout();
    setLocation("/portal/login");
  }

  return (
    <div className="min-h-screen bg-frame-black text-frame-white">
      <header className="border-b border-frame-gray-3 bg-frame-black/95 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0 flex items-center gap-3">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center border border-frame-orange/35 bg-frame-orange/[0.08] sm:flex">
              <ActiveIcon className="h-5 w-5 text-frame-orange" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="frame-label">// Portal do Cliente</p>
              <p className="text-sm text-frame-white font-semibold truncate">{client?.name}</p>
              {client?.company && <p className="text-xs text-frame-gray-light truncate">{client.company}</p>}
            </div>
          </div>
          <button type="button" onClick={handleLogout} className="inline-flex min-h-11 items-center gap-2 px-3 font-frame-mono text-xs text-frame-gray-light hover:text-frame-orange transition">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-6 pb-3 md:hidden">
          <label className="sr-only" htmlFor="portal-mobile-nav">
            Seção do portal
          </label>
          <select
            id="portal-mobile-nav"
            value={activeItem.href}
            onChange={(event) => setLocation(event.target.value)}
            className="w-full min-h-11 bg-frame-gray-1 border border-frame-gray-3 px-3 text-sm text-frame-white outline-none focus:border-frame-orange"
          >
            {NAV_ITEMS.map((item) => (
              <option key={item.href} value={item.href}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <nav className="hidden max-w-6xl mx-auto px-4 md:px-6 md:flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setLocation(item.href)}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 py-2 font-frame-mono text-xs tracking-wider transition-[color,border-color,background-color] ${
                  isActive
                    ? "text-frame-orange border-frame-orange"
                    : "text-frame-gray-light border-transparent hover:text-frame-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="text-[0.54rem] text-current/70">{item.stage}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-6 md:py-8">
        <section className="mb-6 border border-frame-gray-3/70 bg-frame-gray-1/15 p-4 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">
                {activeItem.stage} / {activeItem.label}
              </p>
              <h1 className="mt-2 frame-title text-[clamp(1.65rem,4vw,2.7rem)] leading-none text-frame-white">
                Central do cliente sem ruído.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-frame-gray-light">
                Acompanhe projetos, aprove propostas, encontre arquivos e marque reuniões pelo mesmo caminho.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:w-[460px]">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                return (
                  <button
                    key={`rail-${item.href}`}
                    type="button"
                    onClick={() => setLocation(item.href)}
                    aria-current={isActive ? "page" : undefined}
                    className={`min-h-[74px] min-w-0 border p-2 text-left transition ${
                      isActive ? "border-frame-orange bg-frame-orange/[0.08]" : "border-frame-gray-3/60 bg-frame-black/25 hover:border-frame-orange/40"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-frame-mono text-[0.5rem] uppercase tracking-[0.12em] text-frame-orange">{item.stage}</span>
                      <Icon className="h-3.5 w-3.5 shrink-0 text-frame-orange" aria-hidden="true" />
                    </span>
                    <span className="mt-2 block truncate text-xs font-semibold text-frame-white">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
        {children}
      </main>
    </div>
  );
}
