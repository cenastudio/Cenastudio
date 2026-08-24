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
    <section className="relative overflow-hidden rounded-2xl border border-frame-gray-3/55 bg-[linear-gradient(135deg,rgba(16,16,16,0.78),rgba(0,0,0,0.42))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:px-5 sm:py-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.42fr)] xl:items-start">
        <div className="min-w-0">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-frame-orange/35 bg-frame-orange/[0.08]">
              <Icon className="h-5 w-5 text-frame-orange" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.18em] text-frame-orange">{eyebrow}</p>
              <h1 className="mt-2 frame-title max-w-3xl text-[clamp(1.65rem,3vw,2.55rem)] leading-none text-frame-white text-balance">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-frame-gray-light text-pretty">
                {description}
              </p>
            </div>
          </div>

          <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
            {JOURNEY_STAGES.map((stage, index) => {
              const active = stage === currentStage;
              return (
                <div
                  key={stage}
                  className={`flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 ${
                    active ? "border-frame-orange bg-frame-orange/[0.1] text-frame-white" : "border-frame-gray-3/60 bg-frame-black/20 text-frame-gray-light"
                  }`}
                >
                  <span className={`font-frame-mono text-[0.5rem] uppercase tracking-[0.1em] ${active ? "text-frame-orange" : "text-frame-gray-muted"}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.72rem] font-semibold">{stage}</span>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="min-w-0 space-y-4 xl:border-l xl:border-frame-gray-3/45 xl:pl-5">
          {metrics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {metrics.slice(0, 4).map((metric) => (
                <div key={metric.label} className="min-w-[132px] flex-1 rounded-xl border border-frame-gray-3/55 bg-frame-black/24 px-3 py-2">
                  <span className="block truncate font-frame-mono text-[0.5rem] uppercase tracking-[0.13em] text-frame-gray-muted">
                    {metric.label}
                  </span>
                  <span className="mt-1 flex min-w-0 items-baseline gap-2">
                    <strong className="truncate text-base leading-none text-frame-white">{metric.value}</strong>
                    {metric.detail && <span className="truncate text-[0.62rem] text-frame-gray-light">{metric.detail}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}

          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.slice(0, 3).map((action, index) => (
                <a
                  key={`${action.label}-${action.detail}`}
                  href={action.href || "#"}
                  onClick={(event) => handleAction(event, action)}
                  className={`group flex min-h-11 min-w-[150px] flex-1 items-center justify-between gap-3 rounded-xl border px-3 py-2 transition ${
                    index === 0
                      ? "border-frame-orange/55 bg-frame-orange/[0.08] text-frame-white"
                      : "border-frame-gray-3/60 bg-frame-black/24 text-frame-gray-light hover:border-frame-orange/45 hover:text-frame-white"
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-frame-orange" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-[0.78rem] font-semibold">{action.label}</span>
                      <span className="block truncate text-[0.62rem] text-frame-gray-light">{action.detail}</span>
                    </span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-frame-orange transition group-hover:translate-x-0.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
