import type { MouseEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export interface VisualMetric {
  label: string;
  value: string | number;
  detail?: string;
}

export interface VisualAction {
  label: string;
  detail: string;
  href?: string;
  onClick?: () => void;
}

export interface ScreenDesignPassProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  metrics?: VisualMetric[];
  actions?: VisualAction[];
  currentStage?: string;
  onNavigate?: (href: string) => void;
}

const JOURNEY_STAGES = ["Comercial", "Projeto", "Produção", "Aprovação", "Entrega", "Financeiro"];

export function ScreenDesignPass({
  eyebrow,
  title,
  description,
  icon: Icon,
  metrics = [],
  actions = [],
  currentStage,
  onNavigate,
}: ScreenDesignPassProps) {
  const handleAction = (event: MouseEvent<HTMLAnchorElement>, action: VisualAction) => {
    if (action.onClick) {
      event.preventDefault();
      action.onClick();
      return;
    }
    if (action.href && onNavigate) {
      event.preventDefault();
      onNavigate(action.href);
    }
  };

  return (
    <section className="relative overflow-hidden border border-frame-gray-3/70 bg-frame-gray-1/20">
      <div className="absolute inset-x-0 top-0 h-px bg-frame-orange/50" aria-hidden="true" />
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 p-5 sm:p-6 lg:p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-frame-orange/35 bg-frame-orange/[0.08]">
              <Icon className="h-5 w-5 text-frame-orange" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.18em] text-frame-orange">{eyebrow}</p>
              <p className="mt-1 text-xs text-frame-gray-light">Jornada operacional visível</p>
            </div>
          </div>
          <h1 className="frame-title max-w-3xl text-[clamp(1.9rem,4vw,3.25rem)] leading-none text-frame-white text-balance">
            {title}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-frame-gray-light text-pretty">
            {description}
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {JOURNEY_STAGES.map((stage, index) => {
              const active = stage === currentStage;
              return (
                <div
                  key={stage}
                  className={`min-h-12 border px-3 py-2 ${
                    active ? "border-frame-orange bg-frame-orange/[0.08]" : "border-frame-gray-3/60 bg-frame-black/20"
                  }`}
                >
                  <span className={`font-frame-mono text-[0.52rem] uppercase tracking-[0.14em] ${active ? "text-frame-orange" : "text-frame-gray-light"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-1 block truncate text-xs font-semibold text-frame-white">{stage}</span>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="min-w-0 border-t border-frame-gray-3/60 p-5 sm:p-6 lg:border-l lg:border-t-0">
          {metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {metrics.slice(0, 4).map((metric) => (
                <div key={metric.label} className="min-h-[92px] border border-frame-gray-3/60 bg-frame-black/25 p-3">
                  <span className="block truncate font-frame-mono text-[0.52rem] uppercase tracking-[0.14em] text-frame-gray-light">
                    {metric.label}
                  </span>
                  <strong className="mt-2 block truncate text-xl leading-none text-frame-white">{metric.value}</strong>
                  {metric.detail && <span className="mt-2 block truncate text-[0.62rem] text-frame-gray-light">{metric.detail}</span>}
                </div>
              ))}
            </div>
          )}

          {actions.length > 0 && (
            <div className={metrics.length > 0 ? "mt-4 space-y-2" : "space-y-2"}>
              <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">Ações desta tela</p>
              {actions.slice(0, 3).map((action) => (
                <a
                  key={`${action.label}-${action.detail}`}
                  href={action.href || "#"}
                  onClick={(event) => handleAction(event, action)}
                  className="group flex min-h-14 min-w-0 items-center justify-between gap-3 overflow-hidden border border-frame-gray-3/70 bg-frame-black/30 px-3 py-2 transition hover:border-frame-orange/60"
                >
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-frame-orange" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-frame-white">{action.label}</span>
                      <span className="block truncate text-xs text-frame-gray-light">{action.detail}</span>
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-frame-orange transition group-hover:translate-x-0.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
