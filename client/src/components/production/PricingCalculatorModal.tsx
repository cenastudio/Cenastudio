import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calculator, Plane, Film, Scissors, Camera, Building2, Plus, Trash2, Info, Wallet, FileText, Loader2, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";
import { api, type Client, type Project } from "@/lib/api";

/**
 * Pricing Calculator (Phase 1 — standalone, no persistence yet).
 *
 * Answers a different question than the Timesheet ledger: instead of
 * "how much did this job cost me" (retroactive, from tracked hours), this
 * answers "how much should I charge" (prospective, before accepting a job).
 * Same underlying math (hours x rate), opposite direction in time.
 *
 * Presets exist because a generic hourly-rate calculator is exactly what's
 * already free online — the value of having this inside Cena Studio is the
 * profession-specific fixed-cost checklist (drone insurance/ANAC license,
 * assistant day-rate, gear depreciation, etc.) that a filmmaker/drone
 * pilot/editor actually has to account for and usually forgets.
 */

interface FixedCost {
  id: string;
  label: string;
  value: string; // raw BRL input, e.g. "150,00"
}

interface ProfessionalPreset {
  id: string;
  label: string;
  icon: typeof Plane;
  defaultHourlyRate: string;
  defaultMarginPercent: number;
  suggestedFixedCosts: Array<{ label: string; value: string }>;
  note: string;
}

const PRESETS: ProfessionalPreset[] = [
  {
    id: "drone",
    label: "Piloto de Drone / FPV",
    icon: Plane,
    defaultHourlyRate: "180,00",
    defaultMarginPercent: 25,
    suggestedFixedCosts: [
      { label: "Seguro do equipamento", value: "80,00" },
      { label: "Baterias / manutenção", value: "40,00" },
      { label: "Licença ANAC / SARPAS (se aplicável)", value: "0,00" },
    ],
    note: "Inclua seguro e regularização (SARPAS/ANAC) mesmo quando o cliente não pede — é custo real do voo.",
  },
  {
    id: "editor",
    label: "Editor de vídeo",
    icon: Scissors,
    defaultHourlyRate: "90,00",
    defaultMarginPercent: 20,
    suggestedFixedCosts: [
      { label: "Licenças de software / plugins", value: "30,00" },
      { label: "Trilha / banco de imagens", value: "0,00" },
    ],
    note: "Considere o tempo de revisões extras — jobs de edição costumam ter mais rounds do que o previsto.",
  },
  {
    id: "filmmaker",
    label: "Filmmaker / Videomaker solo",
    icon: Film,
    defaultHourlyRate: "150,00",
    defaultMarginPercent: 25,
    suggestedFixedCosts: [
      { label: "Depreciação de equipamento", value: "100,00" },
      { label: "Deslocamento", value: "0,00" },
      { label: "Assistente / segundo operador", value: "0,00" },
    ],
    note: "Depreciação de equipamento é fácil de esquecer e é o que mais reduz a margem real no fim do mês.",
  },
  {
    id: "photographer",
    label: "Fotógrafo",
    icon: Camera,
    defaultHourlyRate: "120,00",
    defaultMarginPercent: 25,
    suggestedFixedCosts: [
      { label: "Edição / tratamento de imagens", value: "60,00" },
      { label: "Depreciação de equipamento", value: "70,00" },
    ],
    note: "",
  },
  {
    id: "production",
    label: "Produtora / Equipe completa",
    icon: Building2,
    defaultHourlyRate: "250,00",
    defaultMarginPercent: 30,
    suggestedFixedCosts: [
      { label: "Equipe (diárias)", value: "800,00" },
      { label: "Equipamentos e transporte", value: "300,00" },
      { label: "Contingência (imprevistos)", value: "150,00" },
    ],
    note: "Contingência de 10-15% no orçamento de produtora cobre imprevistos de set sem você absorver o custo.",
  },
];

function parseBRL(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

let costIdCounter = 0;
function nextCostId() {
  costIdCounter += 1;
  return `cost-${costIdCounter}`;
}

interface PricingCalculatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PricingCalculatorModal({ open, onOpenChange }: PricingCalculatorModalProps) {
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [hours, setHours] = useState("4");
  const [hourlyRate, setHourlyRate] = useState(PRESETS[0].defaultHourlyRate);
  const [fixedCosts, setFixedCosts] = useState<FixedCost[]>(
    PRESETS[0].suggestedFixedCosts.map((c) => ({ id: nextCostId(), label: c.label, value: c.value })),
  );
  const [marginPercent, setMarginPercent] = useState(String(PRESETS[0].defaultMarginPercent));
  const [isRush, setIsRush] = useState(false);
  const [rushPercent, setRushPercent] = useState("20");
  const [jobLabel, setJobLabel] = useState("");

  // Phase 2: send the calculated total into a real project as a Budget
  // entry, or into a Proposal for a client — instead of the number just
  // living in this modal.
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | "">("");
  const [selectedClientId, setSelectedClientId] = useState<number | "">("");
  const [savingBudget, setSavingBudget] = useState(false);
  const [savingProposal, setSavingProposal] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState<{ url: string; clientName: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    api.projects.list().then(setProjects).catch(() => setProjects([]));
    api.clients.list().then(setClients).catch(() => setClients([]));
  }, [open]);

  // Picking a project tied to a client pre-selects that client for the
  // proposal action, since a proposal always belongs to a client.
  useEffect(() => {
    if (!selectedProjectId) return;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (project?.clientId) setSelectedClientId(project.clientId);
  }, [selectedProjectId, projects]);

  const activePreset = useMemo(() => PRESETS.find((p) => p.id === presetId) ?? PRESETS[0], [presetId]);

  const applyPreset = (preset: ProfessionalPreset) => {
    setPresetId(preset.id);
    setHourlyRate(preset.defaultHourlyRate);
    setMarginPercent(String(preset.defaultMarginPercent));
    setFixedCosts(preset.suggestedFixedCosts.map((c) => ({ id: nextCostId(), label: c.label, value: c.value })));
  };

  const addFixedCost = () => {
    setFixedCosts((prev) => [...prev, { id: nextCostId(), label: "", value: "0,00" }]);
  };

  const updateFixedCost = (id: string, patch: Partial<FixedCost>) => {
    setFixedCosts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeFixedCost = (id: string) => {
    setFixedCosts((prev) => prev.filter((c) => c.id !== id));
  };

  const breakdown = useMemo(() => {
    const hoursNum = Math.max(0, parseBRL(hours));
    const rateNum = Math.max(0, parseBRL(hourlyRate));
    const laborCost = hoursNum * rateNum;
    const fixedTotal = fixedCosts.reduce((sum, c) => sum + Math.max(0, parseBRL(c.value)), 0);
    const baseCost = laborCost + fixedTotal;

    const rushPct = isRush ? Math.max(0, parseBRL(rushPercent)) : 0;
    const rushAmount = baseCost * (rushPct / 100);
    const subtotal = baseCost + rushAmount;

    const marginPct = Math.max(0, parseBRL(marginPercent));
    const marginAmount = subtotal * (marginPct / 100);
    const total = subtotal + marginAmount;

    return { hoursNum, rateNum, laborCost, fixedTotal, rushAmount, subtotal, marginAmount, total };
  }, [hours, hourlyRate, fixedCosts, isRush, rushPercent, marginPercent]);

  const totalCents = Math.round(breakdown.total * 100);
  const defaultTitle = jobLabel.trim() || `${activePreset.label} — ${new Date().toLocaleDateString("pt-BR")}`;

  const handleAddToBudget = async () => {
    if (!selectedProjectId) {
      toast.error("Escolha um projeto para lançar o valor no orçamento.");
      return;
    }
    setSavingBudget(true);
    try {
      await api.budgets.addEntry(selectedProjectId, {
        category: "Orçamento estimado",
        description: defaultTitle,
        amount: totalCents,
        entryDate: new Date().toISOString().slice(0, 10),
      });
      toast.success("Valor lançado no orçamento do projeto");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao lançar no orçamento");
    } finally {
      setSavingBudget(false);
    }
  };

  const buildProposalHtml = () => {
    const rows = [
      `<tr><td>Mão de obra (${breakdown.hoursNum}h × ${formatBRL(breakdown.rateNum)})</td><td style="text-align:right">${formatBRL(breakdown.laborCost)}</td></tr>`,
      ...fixedCosts
        .filter((c) => c.label.trim())
        .map((c) => `<tr><td>${c.label}</td><td style="text-align:right">${formatBRL(parseBRL(c.value))}</td></tr>`),
      isRush && breakdown.rushAmount > 0
        ? `<tr><td>Acréscimo de urgência</td><td style="text-align:right">${formatBRL(breakdown.rushAmount)}</td></tr>`
        : "",
      `<tr><td>Margem</td><td style="text-align:right">${formatBRL(breakdown.marginAmount)}</td></tr>`,
    ].filter(Boolean).join("");

    return `
      <h2>${defaultTitle}</h2>
      <p>${activePreset.label}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        ${rows}
        <tr style="font-weight:bold;border-top:2px solid #333">
          <td style="padding-top:8px">Total</td>
          <td style="text-align:right;padding-top:8px">${formatBRL(breakdown.total)}</td>
        </tr>
      </table>
    `;
  };

  const handleGenerateProposal = async () => {
    if (!selectedClientId) {
      toast.error("Escolha um cliente para gerar a proposta.");
      return;
    }
    setSavingProposal(true);
    setGeneratedProposal(null);
    try {
      const result = await api.proposals.create({
        clientId: selectedClientId,
        title: defaultTitle,
        html: buildProposalHtml(),
        total: totalCents,
      });
      // Don't window.open() here — by the time this await resolves, the
      // browser no longer treats it as tied to the user's click, so Safari
      // (and often Chrome) silently blocks the popup with no visible
      // error. It genuinely looked like "nothing happened" even though the
      // proposal really was created. Show the link in the modal instead,
      // with a button the user clicks themselves (a real click = never
      // blocked), plus a copy-link fallback.
      const client = clients.find((c) => c.id === selectedClientId);
      setGeneratedProposal({ url: result.proposal_url, clientName: client?.name ?? "cliente" });
      toast.success("Proposta gerada com sucesso");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao gerar proposta");
    } finally {
      setSavingProposal(false);
    }
  };

  const copyProposalLink = async () => {
    if (!generatedProposal) return;
    try {
      await navigator.clipboard.writeText(generatedProposal.url);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar o link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-3xl rounded-none p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="frame-title text-2xl flex items-center gap-2">
            <Calculator className="w-5 h-5 text-frame-orange" />
            Calculadora de Precificação
          </DialogTitle>
          <DialogDescription className="text-frame-gray-light text-sm">
            Estime quanto cobrar por um trabalho antes de aceitar — não substitui o Timesheet, complementa: aqui você
            projeta o valor, lá você confere o custo real depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          {/* Professional type presets */}
          <div>
            <label className="block text-xs font-medium text-frame-gray-light mb-2">Tipo de profissional</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isActive = preset.id === presetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className={`border p-3 text-center transition flex flex-col items-center gap-1.5 ${
                      isActive
                        ? "border-frame-orange bg-frame-orange/10 text-frame-orange"
                        : "border-frame-gray-3 bg-transparent text-frame-gray-light hover:border-frame-orange/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-[0.62rem] leading-tight">{preset.label}</span>
                  </button>
                );
              })}
            </div>
            {activePreset.note && (
              <p className="text-[0.65rem] text-frame-gray-light mt-2 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-frame-orange shrink-0 mt-0.5" />
                {activePreset.note}
              </p>
            )}
          </div>

          {/* Hours + rate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Horas estimadas</label>
              <input
                type="text"
                inputMode="decimal"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="frame-input w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Taxa/hora (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="frame-input w-full font-mono"
              />
            </div>
          </div>

          {/* Fixed costs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-frame-gray-light">Custos fixos do job</label>
              <button
                type="button"
                onClick={addFixedCost}
                className="text-xs text-frame-orange hover:text-frame-orange/80 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar custo
              </button>
            </div>
            <div className="space-y-2">
              {fixedCosts.map((cost) => (
                <div key={cost.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cost.label}
                    onChange={(e) => updateFixedCost(cost.id, { label: e.target.value })}
                    placeholder="Descrição do custo"
                    className="frame-input flex-1"
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cost.value}
                    onChange={(e) => updateFixedCost(cost.id, { value: e.target.value })}
                    placeholder="0,00"
                    className="frame-input w-28 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => removeFixedCost(cost.id)}
                    className="p-2 border border-frame-gray-3/50 hover:border-red-500 hover:text-red-500 transition shrink-0"
                    title="Remover custo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {fixedCosts.length === 0 && (
                <p className="text-xs text-frame-gray-light">Nenhum custo fixo adicionado.</p>
              )}
            </div>
          </div>

          {/* Margin + rush */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Margem de lucro (%)</label>
              <input
                type="text"
                inputMode="decimal"
                value={marginPercent}
                onChange={(e) => setMarginPercent(e.target.value)}
                className="frame-input w-full font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Urgência</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsRush((prev) => !prev)}
                  className={`flex-1 border px-3 py-2 text-sm transition ${
                    isRush
                      ? "border-frame-orange bg-frame-orange/10 text-frame-orange"
                      : "border-frame-gray-3 text-frame-gray-light hover:border-frame-orange/50"
                  }`}
                >
                  {isRush ? "Job urgente" : "Prazo normal"}
                </button>
                {isRush && (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={rushPercent}
                    onChange={(e) => setRushPercent(e.target.value)}
                    className="frame-input w-16 font-mono text-center"
                    title="Acréscimo de urgência (%)"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Job label */}
          <div>
            <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Nome do job (opcional)</label>
            <input
              type="text"
              value={jobLabel}
              onChange={(e) => setJobLabel(e.target.value)}
              placeholder={defaultTitle}
              className="frame-input w-full"
            />
          </div>

          {/* Breakdown */}
          <div className="border border-frame-orange/40 bg-frame-orange/[0.06] p-4 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-frame-gray-light">Mão de obra ({breakdown.hoursNum}h × {formatBRL(breakdown.rateNum)})</span>
              <span className="text-frame-white font-mono">{formatBRL(breakdown.laborCost)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-frame-gray-light">Custos fixos</span>
              <span className="text-frame-white font-mono">{formatBRL(breakdown.fixedTotal)}</span>
            </div>
            {isRush && breakdown.rushAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-frame-gray-light">Acréscimo de urgência</span>
                <span className="text-frame-white font-mono">{formatBRL(breakdown.rushAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-frame-gray-light">Margem de lucro</span>
              <span className="text-frame-white font-mono">{formatBRL(breakdown.marginAmount)}</span>
            </div>
            <div className="pt-2 mt-1 border-t border-frame-orange/30 flex items-center justify-between">
              <span className="text-sm font-semibold text-frame-white">Valor sugerido do orçamento</span>
              <span className="text-2xl font-bold text-frame-orange font-mono">{formatBRL(breakdown.total)}</span>
            </div>
          </div>

          {/* Turn the estimate into a real document */}
          <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4 space-y-3">
            <p className="font-frame-mono text-[0.62rem] uppercase tracking-wide text-frame-gray-light">
              Usar este valor
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Projeto</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : "")}
                  className="frame-input w-full"
                >
                  <option value="">Selecione um projeto</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Cliente</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    setSelectedClientId(e.target.value ? Number(e.target.value) : "");
                    setGeneratedProposal(null);
                  }}
                  className="frame-input w-full"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleAddToBudget}
                disabled={savingBudget || !selectedProjectId}
                className="frame-btn-ghost flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingBudget ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                Lançar no Orçamento
              </button>
              <button
                type="button"
                onClick={handleGenerateProposal}
                disabled={savingProposal || !selectedClientId}
                className="frame-btn-primary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingProposal ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Gerar Proposta
              </button>
            </div>
            <p className="text-[0.6rem] text-frame-gray-light">
              "Lançar no Orçamento" registra o valor como estimativa no projeto escolhido. "Gerar Proposta" cria um
              documento pronto para enviar ao cliente escolhido, com o breakdown do cálculo.
            </p>

            {generatedProposal && (
              <div className="border border-frame-green/40 bg-frame-green/[0.06] p-3 space-y-2">
                <p className="text-xs text-frame-white">
                  Proposta criada para <strong>{generatedProposal.clientName}</strong>. Este link pode ser enviado
                  diretamente ao cliente:
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedProposal.url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="frame-input flex-1 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={copyProposalLink}
                    className="frame-btn-ghost inline-flex items-center gap-1.5 shrink-0 px-3"
                    title="Copiar link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <a
                    href={generatedProposal.url}
                    target="_blank"
                    rel="noreferrer"
                    className="frame-btn-primary inline-flex items-center gap-1.5 shrink-0 px-3 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir
                  </a>
                </div>
                <p className="text-[0.6rem] text-frame-gray-light">
                  Também acessível em Comercial → Clientes → {generatedProposal.clientName} → Propostas.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
