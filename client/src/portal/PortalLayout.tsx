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

  async function handleLogout() {
    await logout();
    setLocation("/portal/login");
  }

  return (
    <div className="min-h-screen bg-frame-black">
      <header className="border-b border-frame-gray-3 bg-frame-black/95 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div>
            <p className="frame-label">// Portal do Cliente</p>
            <p className="text-sm text-frame-white font-semibold">{client?.name}</p>
          </div>
          <button type="button" onClick={handleLogout} className="font-frame-mono text-xs text-frame-gray-light hover:text-frame-orange transition">
            Sair
          </button>
        </div>
        <nav className="max-w-5xl mx-auto px-4 md:px-6 flex gap-1 overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href;
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => setLocation(item.href)}
                aria-current={isActive ? "page" : undefined}
                className={`shrink-0 px-3 py-2 font-frame-mono text-xs tracking-wider transition-all border-b-2 ${
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
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">{children}</main>
    </div>
  );
}
