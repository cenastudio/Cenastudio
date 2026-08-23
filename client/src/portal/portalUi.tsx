import type { ReactNode } from "react";

export function PortalPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section className="mb-6 border border-frame-gray-3/70 bg-frame-gray-1/15 p-4 sm:p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">// {eyebrow}</p>
          <h1 className="mt-2 frame-title text-[clamp(1.75rem,4vw,3.2rem)] leading-none text-frame-white text-balance">{title}</h1>
          {description && (
            <p className="text-sm text-frame-gray-light mt-3 max-w-2xl leading-relaxed text-pretty">{description}</p>
          )}
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <div className="grid grid-cols-3 gap-2 sm:w-[360px]">
            {[
              ["01", "Projeto"],
              ["02", "Aprovar"],
              ["03", "Baixar"],
            ].map(([number, label]) => (
              <div key={number} className="min-w-0 border border-frame-gray-3/60 bg-frame-black/25 px-3 py-2">
                <span className="block font-frame-mono text-[0.5rem] uppercase tracking-[0.12em] text-frame-orange">{number}</span>
                <span className="mt-1 block truncate text-xs font-semibold text-frame-white">{label}</span>
              </div>
            ))}
          </div>
          {action}
        </div>
      </div>
    </section>
  );
}

export function PortalEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-8 text-center">
      <p className="font-semibold text-frame-white">{title}</p>
      <p className="text-sm text-frame-gray-light mt-2 max-w-md mx-auto leading-relaxed">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function PortalStatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="border border-frame-gray-3 bg-frame-gray-1/25 p-4">
      <p className="frame-label text-frame-gray-light">{label}</p>
      <p className="text-2xl font-semibold mt-1 text-frame-white">{value}</p>
      {detail && <p className="text-xs text-frame-gray-light mt-2">{detail}</p>}
    </div>
  );
}

export function formatPortalCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPortalDate(value: string | null) {
  if (!value) return "Sem prazo";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatPortalDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function portalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Em andamento",
    completed: "Concluido",
    archived: "Arquivado",
    pending: "Pendente",
    sent: "Enviada",
    viewed: "Visualizada",
    accepted: "Aceita",
    rejected: "Recusada",
    revoked: "Revogada",
    scheduled: "Agendada",
    cancelled: "Cancelada",
  };
  return labels[status] || status;
}
