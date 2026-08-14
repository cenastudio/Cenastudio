import { useEffect } from "react";
import { useLocation } from "wouter";
import { usePortalAuth } from "./PortalAuthContext";

const NAV_ITEMS = [
  { href: "/portal/dashboard", label: "Projetos" },
  { href: "/portal/files", label: "Arquivos" },
  { href: "/portal/proposals", label: "Propostas" },
  { href: "/portal/meetings", label: "Reuniões" },
  { href: "/portal/account", label: "Conta" },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { client, logout } = usePortalAuth();
  const [location, setLocation] = useLocation();
  const activeItem = NAV_ITEMS.find((item) => location === item.href) || NAV_ITEMS[0];

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
          <div className="min-w-0">
            <p className="frame-label">// Portal do Cliente</p>
            <p className="text-sm text-frame-white font-semibold truncate">{client?.name}</p>
            {client?.company && <p className="text-xs text-frame-gray-light truncate">{client.company}</p>}
          </div>
          <button type="button" onClick={handleLogout} className="min-h-11 px-3 font-frame-mono text-xs text-frame-gray-light hover:text-frame-orange transition">
            Sair
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
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setLocation(item.href)}
                aria-current={isActive ? "page" : undefined}
                className={`min-h-11 shrink-0 px-3 py-2 font-frame-mono text-xs tracking-wider transition-all border-b-2 ${
                  isActive
                    ? "text-frame-orange border-frame-orange"
                    : "text-frame-gray-light border-transparent hover:text-frame-white"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</main>
    </div>
  );
}
