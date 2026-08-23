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
    <nav aria-label="Mapa operacional" className="border border-frame-gray-3 bg-frame-gray-1/20 p-3">
      <div className="mb-3 flex items-center gap-2">
        <Compass className="h-4 w-4 text-frame-orange" />
        <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-gray-light">Mapa da operação</p>
      </div>
      <ol className="grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {OPERATION_STEPS.map((step, index) => {
          const active = step.id === current;
          return (
            <li key={step.id} className={`min-h-11 border px-3 py-2 ${active ? "border-frame-orange bg-frame-orange/[0.08] text-frame-orange" : "border-frame-gray-3 text-frame-gray-light"}`}>
              <span className="font-frame-mono text-[0.55rem] uppercase tracking-[0.14em]">{String(index + 1).padStart(2, "0")}</span>
              <p className="mt-1 text-sm font-semibold text-frame-white">{step.label}</p>
            </li>
          );
        })}
      </ol>
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
    <section aria-label="Próximas ações" className="min-w-0 max-w-full overflow-hidden border border-frame-orange/40 bg-frame-orange/[0.05] p-4">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-frame-orange" />
        <h2 className="font-frame-mono text-xs uppercase tracking-[0.16em] text-frame-orange">Próximas ações</h2>
      </div>
      <div className="grid min-w-0 gap-2">
        {actions.map((action, index) => (
          <a key={action.id} href={action.href} onClick={(event) => handleClick(event, action.href)} className="group flex min-h-14 w-full min-w-0 max-w-full items-center justify-between gap-3 overflow-hidden border border-frame-gray-3 bg-frame-black/35 px-3 py-2 hover:border-frame-orange/70">
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span className="shrink-0 font-frame-mono text-[0.58rem] text-frame-orange">{String(index + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-frame-white">{action.label}</span>
                <span className="block truncate text-xs text-frame-gray-light">{action.description}</span>
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-frame-orange transition group-hover:translate-x-0.5" />
          </a>
        ))}
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
    <section aria-label="Catálogo de módulos" className="min-w-0 max-w-full overflow-hidden border border-frame-gray-3 bg-frame-gray-1/15 p-4">
      <div className="mb-3 flex items-center gap-2">
        <LayoutGrid className="h-4 w-4 text-frame-orange" />
        <h2 className="font-frame-mono text-xs uppercase tracking-[0.16em] text-frame-gray-light">Tudo que o Cena faz</h2>
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group} className="min-w-0 space-y-2">
            <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-orange">{group}</p>
            {items.map((item) => (
              <a key={item.id} href={item.href} onClick={(event) => handleClick(event, item.href)} className="flex min-h-14 min-w-0 items-center gap-3 overflow-hidden border border-frame-gray-3/70 px-3 py-2 hover:border-frame-orange/60">
                <Circle className="h-2.5 w-2.5 shrink-0 text-frame-orange" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-frame-white">{item.label}</span>
                  <span className="block truncate text-xs text-frame-gray-light">{item.description}</span>
                </span>
              </a>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
