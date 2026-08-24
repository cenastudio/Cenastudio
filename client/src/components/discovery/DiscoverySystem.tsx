import { ArrowRight, CheckCircle2, Circle, Compass, LayoutGrid } from "lucide-react";

export interface DiscoveryAction {
  id: string;
  label: string;
  description: string;
  href: string;
  tone?: "primary" | "warning" | "neutral";
}

export interface DiscoveryModule {
  id: string;
  label: string;
  description: string;
  href: string;
  group: string;
}

interface DiscoveryNavigationProps {
  onNavigate?: (href: string) => void;
}

const OPERATION_STEPS = [
  { id: "commercial", label: "Comercial" },
  { id: "project", label: "Projeto" },
  { id: "production", label: "Produção" },
  { id: "approval", label: "Aprovação" },
  { id: "delivery", label: "Entrega" },
  { id: "finance", label: "Financeiro" },
];

export function OperationMap({ current = "project" }: { current?: string }) {
  return (
    <nav
      aria-label="Mapa operacional"
      className="min-w-0 rounded-2xl border border-frame-gray-3/60 bg-frame-black/25 px-3 py-3 shadow-[0_18px_70px_rgba(0,0,0,0.22)] sm:px-4"
    >
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-frame-orange/25 bg-frame-orange/[0.08]">
            <Compass className="h-4 w-4 text-frame-orange" aria-hidden="true" />
          </span>
          <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-gray-light">Mapa da operação</p>
        </div>
        <ol className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 xl:flex-1 xl:justify-end xl:pb-0">
        {OPERATION_STEPS.map((step, index) => {
          const active = step.id === current;
          return (
            <li
              key={step.id}
              className={`flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 transition-colors ${
                active
                  ? "border-frame-orange bg-frame-orange text-frame-black"
                  : "border-frame-gray-3/70 bg-frame-gray-1/20 text-frame-gray-light"
              }`}
            >
              <span className={`font-frame-mono text-[0.52rem] uppercase tracking-[0.12em] ${active ? "text-frame-black/70" : "text-frame-orange"}`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={`text-xs font-semibold ${active ? "text-frame-black" : "text-frame-white"}`}>{step.label}</span>
            </li>
          );
        })}
        </ol>
      </div>
    </nav>
  );
}

export function NextActionsPanel({ actions, onNavigate }: { actions: DiscoveryAction[] } & DiscoveryNavigationProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(href);
  };

  return (
    <section
      aria-label="Próximas ações"
      className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-frame-orange/30 bg-frame-orange/[0.045] p-3 shadow-[0_18px_80px_rgba(255,76,0,0.08)] sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-frame-orange" aria-hidden="true" />
          <h2 className="truncate font-frame-mono text-xs uppercase tracking-[0.16em] text-frame-orange">Próximas ações</h2>
        </div>
        <span className="hidden rounded-full border border-frame-orange/25 px-2.5 py-1 font-frame-mono text-[0.52rem] uppercase tracking-[0.12em] text-frame-gray-light sm:inline">
          {actions.length} passos
        </span>
      </div>
      <div className="grid min-w-0 gap-2 md:grid-cols-3">
        {actions.map((action, index) => {
          const primary = index === 0 || action.tone === "primary";
          return (
          <a
            key={action.id}
            href={action.href}
            onClick={(event) => handleClick(event, action.href)}
            className={`group flex min-h-16 w-full min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-colors focus-visible:ring-2 focus-visible:ring-frame-orange/70 ${
              primary
                ? "border-frame-orange/65 bg-frame-orange/[0.14] hover:bg-frame-orange/[0.18]"
                : "border-frame-gray-3/70 bg-frame-black/30 hover:border-frame-orange/55"
            }`}
          >
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-frame-mono text-[0.56rem] ${
                primary ? "bg-frame-orange text-frame-black" : "border border-frame-orange/30 text-frame-orange"
              }`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-frame-white">{action.label}</span>
                <span className="block truncate text-xs text-frame-gray-light">{action.description}</span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-frame-orange transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
          );
        })}
      </div>
    </section>
  );
}

export function ModuleCatalog({ modules, onNavigate }: { modules: DiscoveryModule[] } & DiscoveryNavigationProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(href);
  };

  const groups = modules.reduce<Record<string, DiscoveryModule[]>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] || []), item];
    return acc;
  }, {});

  return (
    <section
      aria-label="Catálogo de módulos"
      className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-frame-gray-3/60 bg-frame-black/20 p-3 sm:p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <LayoutGrid className="h-4 w-4 shrink-0 text-frame-orange" aria-hidden="true" />
          <h2 className="truncate font-frame-mono text-xs uppercase tracking-[0.16em] text-frame-gray-light">Tudo que o Cena faz</h2>
        </div>
        <span className="rounded-full border border-frame-gray-3/70 px-2 py-1 font-frame-mono text-[0.52rem] uppercase tracking-[0.12em] text-frame-gray-light">
          {modules.length}
        </span>
      </div>
      <div className="grid min-w-0 gap-3">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="grid min-w-0 gap-2 sm:grid-cols-[7.25rem_minmax(0,1fr)] sm:items-start">
            <p className="pt-2 font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-orange">{group}</p>
            <div className="flex min-w-0 flex-wrap gap-2">
              {items.map((item) => (
              <a
                key={item.id}
                href={item.href}
                onClick={(event) => handleClick(event, item.href)}
                className="group inline-flex min-h-10 max-w-full items-center gap-2 rounded-full border border-frame-gray-3/70 bg-frame-gray-1/20 px-3 py-2 transition-colors hover:border-frame-orange/60 hover:bg-frame-orange/[0.08] focus-visible:ring-2 focus-visible:ring-frame-orange/70"
              >
                <Circle className="h-2.5 w-2.5 shrink-0 text-frame-orange" aria-hidden="true" />
                <span className="min-w-0 truncate text-sm font-semibold text-frame-white">{item.label}</span>
                <span className="hidden min-w-0 max-w-36 truncate text-xs text-frame-gray-light xl:inline">{item.description}</span>
              </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
