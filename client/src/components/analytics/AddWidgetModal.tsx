import { useMemo, useState } from "react";
import AnimatedModal from "@/components/AnimatedModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export interface WidgetTypeOption {
  value: string;
  labelKey: string;
}

/**
 * Widget type -> valid data sources, mirroring the backend's dataMappers.ts
 * getWidgetData() switch. Kept in sync manually since both sides are small;
 * if a combination isn't listed here, the backend would return an empty
 * shape for it anyway (see the `default:` branches there).
 */
const TYPE_DATA_SOURCES: Record<string, string[]> = {
  kpi: ["tickets", "revenue", "users", "proposals", "projects", "clients"],
  lineChart: ["revenue", "opportunities"],
  barChart: ["clients", "opportunities"],
  pieChart: ["revenue"],
  table: ["clients", "opportunities"],
  funnel: ["opportunities"], // dataSource is ignored server-side, but still required by the API
  gauge: ["revenue"],
  // heatmap intentionally omitted: dataMappers.ts returns an empty shape for it (not implemented yet)
};

const WIDGET_TYPE_LABELS: Record<string, string> = {
  kpi: "KPI (número + tendência)",
  lineChart: "Gráfico de linha",
  barChart: "Gráfico de barras",
  pieChart: "Gráfico de pizza",
  table: "Tabela",
  funnel: "Funil de vendas",
  gauge: "Medidor de meta",
};

const DATA_SOURCE_LABELS: Record<string, string> = {
  tickets: "Tickets",
  revenue: "Receita",
  users: "Usuários",
  proposals: "Propostas",
  projects: "Projetos",
  clients: "Clientes",
  opportunities: "Oportunidades",
};

interface AddWidgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardId: string;
  onCreated: () => void;
}

export default function AddWidgetModal({ isOpen, onClose, dashboardId, onCreated }: AddWidgetModalProps) {
  const { t } = useLanguage();
  const [type, setType] = useState<string>("kpi");
  const [dataSource, setDataSource] = useState<string>("revenue");
  const [title, setTitle] = useState("");
  const [limit, setLimit] = useState("10");
  const [target, setTarget] = useState("100000");
  const [saving, setSaving] = useState(false);

  const availableSources = useMemo(() => TYPE_DATA_SOURCES[type] || [], [type]);

  const handleTypeChange = (nextType: string) => {
    setType(nextType);
    const sources = TYPE_DATA_SOURCES[nextType] || [];
    if (!sources.includes(dataSource)) {
      setDataSource(sources[0] || "");
    }
  };

  const reset = () => {
    setType("kpi");
    setDataSource("revenue");
    setTitle("");
    setLimit("10");
    setTarget("100000");
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Dê um título ao widget.");
      return;
    }
    if (!dataSource) {
      toast.error("Escolha uma fonte de dados.");
      return;
    }

    const config: Record<string, unknown> = {};
    if (type === "table") config.limit = Number(limit) || 10;
    if (type === "gauge") config.target = Number(target) || 100000;

    setSaving(true);
    try {
      const response = await fetch("/api/analytics/widgets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dashboardId,
          type,
          title: title.trim(),
          dataSource,
          config,
          position: { x: 0, y: 0, w: 4, h: 3 },
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Erro ao criar widget");
      }
      toast.success("Widget adicionado");
      reset();
      onCreated();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao criar widget");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Adicionar Widget"
      description="Escolha o tipo de visualização e a fonte de dados. O widget passa a puxar dados reais do sistema imediatamente."
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={saving} className="frame-btn-ghost">
            {t("app.common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="frame-btn-primary">
            {saving ? "Adicionando..." : "Adicionar Widget"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-1 block">
            Título do widget
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Receita mensal"
            className="frame-input w-full"
            maxLength={80}
          />
        </div>

        <div>
          <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-2 block">
            Tipo de visualização
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.keys(TYPE_DATA_SOURCES).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleTypeChange(opt)}
                className={`border p-2 text-center text-xs transition ${
                  type === opt
                    ? "border-frame-orange bg-frame-orange/10 text-frame-orange"
                    : "border-frame-gray-3 bg-transparent text-frame-gray-light hover:border-frame-orange/50"
                }`}
              >
                {WIDGET_TYPE_LABELS[opt]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-1 block">
            Fonte de dados
          </label>
          <select value={dataSource} onChange={(e) => setDataSource(e.target.value)} className="frame-input w-full">
            {availableSources.map((source) => (
              <option key={source} value={source}>{DATA_SOURCE_LABELS[source] || source}</option>
            ))}
          </select>
        </div>

        {type === "table" && (
          <div>
            <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-1 block">
              Número de linhas
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="frame-input w-full"
            />
          </div>
        )}

        {type === "gauge" && (
          <div>
            <label className="font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-gray-light mb-1 block">
              Meta (R$)
            </label>
            <input
              type="number"
              min="0"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="frame-input w-full"
            />
          </div>
        )}
      </div>
    </AnimatedModal>
  );
}
