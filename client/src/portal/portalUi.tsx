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
    <section className="border-b border-frame-gray-3 pb-6 mb-6">
      <p className="frame-label mb-2">// {eyebrow}</p>
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-frame-white">{title}</h1>
          {description && (
            <p className="text-sm text-frame-gray-light mt-2 max-w-2xl leading-relaxed">{description}</p>
          )}
        </div>
        {action}
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
