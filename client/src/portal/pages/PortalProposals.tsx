import { useEffect, useState } from "react";
import { portalApi, type PortalProposalSummary } from "../portalApi";
import PortalLayout from "../PortalLayout";
import { formatPortalCurrency, formatPortalDate, PortalEmptyState, PortalPageHeader, PortalStatCard, portalStatusLabel } from "../portalUi";

export default function PortalProposals() {
  const [proposals, setProposals] = useState<PortalProposalSummary[] | null>(null);

  useEffect(() => {
    portalApi.proposals.list().then(setProposals).catch(() => setProposals([]));
  }, []);

  const accepted = proposals?.filter((proposal) => proposal.status === "accepted").length ?? 0;
  const open = proposals?.filter((proposal) => !["accepted", "rejected", "revoked"].includes(proposal.status)).length ?? 0;
  const total = proposals?.reduce((sum, proposal) => sum + proposal.total, 0) ?? 0;

  return (
    <PortalLayout>
      <PortalPageHeader
        eyebrow="Propostas"
        title="Propostas e valores"
        description="Veja o que foi enviado, o status de cada proposta e o valor total associado ao relacionamento."
      />

      {proposals === null && <p className="text-frame-gray-light">Carregando…</p>}
      {proposals?.length === 0 && (
        <PortalEmptyState
          title="Nenhuma proposta ainda."
          description="Quando o estudio enviar uma proposta para este cliente, ela aparece aqui com status e valor."
        />
      )}

      {proposals && proposals.length > 0 && (
        <>
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <PortalStatCard label="Em aberto" value={open} />
            <PortalStatCard label="Aceitas" value={accepted} />
            <PortalStatCard label="Total enviado" value={formatPortalCurrency(total)} />
          </section>

          <ul className="space-y-3">
            {proposals.map((proposal) => (
              <li key={proposal.id} className="border border-frame-gray-3 bg-frame-gray-1/30 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-frame-white truncate">{proposal.title}</p>
                    <p className="font-frame-mono text-[0.6rem] uppercase text-frame-gray-light mt-1">
                      {portalStatusLabel(proposal.status)} · criada em {formatPortalDate(proposal.createdAt)}
                    </p>
                    {proposal.acceptedAt && (
                      <p className="text-xs text-frame-green mt-2">Aceita em {formatPortalDate(proposal.acceptedAt)}</p>
                    )}
                  </div>
                  <p className="font-frame-mono text-sm text-frame-orange shrink-0">{formatPortalCurrency(proposal.total)}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </PortalLayout>
  );
}
