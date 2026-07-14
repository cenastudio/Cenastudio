import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calculator, Plane, Film, Scissors, Camera, Building2, Plus, Trash2, Info } from "lucide-react";

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

          <p className="text-[0.62rem] text-frame-gray-light text-center">
            Cálculo local, não é salvo. Use como referência para montar sua proposta ou orçamento no projeto.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
