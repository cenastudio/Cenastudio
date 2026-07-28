import { useEffect, useState } from "react";
import { portalApi, type PortalProposalSummary } from "../portalApi";
import PortalLayout from "../PortalLayout";

function formatCurrency(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_LABEL: Record<string, string> = {
  sent: "Enviada",
  viewed: "Visualizada",
  accepted: "Aceita",
  rejected: "Rejeitada",
  revoked: "Revogada",
};

export default function PortalProposals() {
  const [proposals, setProposals] = useState<PortalProposalSummary[] | null>(null);

  useEffect(() => {
    portalApi.proposals.list().then(setProposals).catch(() => setProposals([]));
  }, []);

  return (
    <PortalLayout>
      <p className="frame-label mb-2">// Propostas</p>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-frame-white mb-6">Propostas</h1>

      {proposals === null && <p className="text-frame-gray-light">Carregando...</p>}
      {proposals?.length === 0 && <p className="text-frame-gray-light">Nenhuma proposta ainda.</p>}

      <ul className="space-y-2">
        {proposals?.map((proposal) => (
          <li key={proposal.id} className="border border-frame-gray-3 bg-frame-gray-1/30 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-frame-white">{proposal.title}</p>
              <p className="font-frame-mono text-[0.6rem] uppercase text-frame-gray-light">
                {STATUS_LABEL[proposal.status] || proposal.status}
              </p>
            </div>
            <p className="font-frame-mono text-sm text-frame-orange">{formatCurrency(proposal.total)}</p>
          </li>
        ))}
      </ul>
    </PortalLayout>
  );
}
