import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";
import { api, type DreReport, type DreDeduction, type Project } from "@/lib/api";
import { readStudioSettings, type StudioSettings } from "@/lib/studioSettings";
import {
  FileBarChart,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  ArrowRight,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { SITE_CONFIG } from "@shared/site";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

/** Parses a "R$ 1.234,56" / "1234,56" / "1234.56" style input into integer cents. */
function parseCurrencyInput(value: string): number {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3},)/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

/** Percent input ("5" ou "5,5") → pontos-base (10000 = 100%). */
function parsePercentInput(value: string): number {
  const normalized = value.replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function basisPointsToPercentInput(value: number): string {
  return (value / 100).toString();
}

interface DeductionDraft {
  name: string;
  type: "percent" | "fixed";
  valueInput: string; // percent input (e.g. "6") or currency input (e.g. "150,00")
}

function esc(value: string | number | null | undefined) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] || char));
}

/** Replica o padrão de impressão via iframe usado em Documents.tsx/Proposals.tsx (não há módulo compartilhado real). */
function printDreReport(docHtml: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 1000);
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      toast.error("Não foi possível gerar o PDF");
      return;
    }
    frameWindow.focus();
    frameWindow.onafterprint = cleanup;
    window.setTimeout(() => {
      frameWindow.print();
      cleanup();
    }, 250);
  };

  iframe.srcdoc = docHtml;
}

function buildDreReportHtml(report: DreReport, project: Project | null, studio: StudioSettings) {
  const accent = studio.primaryColor || SITE_CONFIG.primaryColor;
  const rows: Array<[string, number, boolean?]> = [
    ["Receita bruta", report.grossRevenue],
    ...report.deductions.map((d): [string, number] => [`(-) ${d.name}`, -d.amount]),
    ["Receita líquida", report.netRevenue, true],
    ["(-) Custos diretos", -report.directCosts],
    ["Resultado bruto", report.grossResult, true],
    ["(-) Despesas alocadas", -report.allocatedExpense],
    ["Resultado líquido", report.netResult, true],
  ];

  const rowsHtml = rows
    .map(([label, value, emphasis]) => {
      const isNegative = value < 0;
      return `<div class="dre-row${emphasis ? " dre-row-total" : ""}">
        <span class="dre-row-label">${esc(label)}</span>
        <span class="dre-row-value${isNegative ? " dre-row-negative" : ""}">${esc(formatCurrency(value, report.currency))}</span>
      </div>`;
    })
    .join("");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>DRE - ${esc(project?.name || "Projeto")}</title>
  <style>
    @page{size:A4;margin:0}
    *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    html,body{margin:0;min-height:100%;background:#f2ede4;color:#141414;font-family:Arial,sans-serif}
    .doc-page{width:210mm;min-height:297mm;margin:0 auto;background:#fbf7f0;padding:18mm}
    .doc-kicker{font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:${accent}}
    .doc-title{font-size:36px;line-height:1;margin:10px 0;font-weight:900;color:#111}
    .doc-header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid ${accent};padding-bottom:22px}
    .doc-brand{text-align:right;font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#666}
    .doc-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:24px}
    .doc-field{border:1px solid #ddd4c7;background:rgba(255,253,248,.88);padding:11px}
    .doc-field-label{font-size:9px;color:#777;font-weight:900;text-transform:uppercase;letter-spacing:.08em;margin-bottom:5px}
    .doc-field-value{font-size:12px;color:#1a1a1a;font-weight:700}
    .dre-table{margin-top:28px;border-top:1px solid #d8d0c3}
    .dre-row{display:flex;justify-content:space-between;padding:10px 4px;border-bottom:1px solid #e5ddce;font-size:13px}
    .dre-row-label{color:#333}
    .dre-row-value{font-weight:700;font-family:monospace}
    .dre-row-negative{color:#c0392b}
    .dre-row-total{font-weight:900;background:${accent}0f;border-top:2px solid ${accent};border-bottom:2px solid ${accent}}
    .doc-footer{margin-top:42px;padding-top:18px;border-top:1px solid #d8d0c3;display:flex;justify-content:space-between;gap:20px;color:#777;font-size:11px}
    @media screen{html,body{width:100%}.doc-page{width:100%;margin:0;box-shadow:0 22px 70px rgba(0,0,0,.16)}}
    @media print{html,body{width:210mm;min-height:297mm}.doc-page{width:210mm;min-height:297mm;height:auto;margin:0;padding:16mm;box-shadow:none}}
  </style>
</head>
<body>
  <main class="doc-page">
    <header class="doc-header">
      <div>
        <div class="doc-kicker">${esc(studio.studioName)} · DRE</div>
        <h1 class="doc-title">Demonstrativo de Resultado</h1>
      </div>
      <div class="doc-brand">${esc(studio.studioName)}<br/>${esc(studio.email || studio.phone || "")}<br/>${new Date().toLocaleDateString("pt-BR")}</div>
    </header>
    <div class="doc-grid">
      <div class="doc-field"><div class="doc-field-label">Projeto</div><div class="doc-field-value">${esc(project?.name || "-")}</div></div>
      <div class="doc-field"><div class="doc-field-label">Cliente</div><div class="doc-field-value">${esc(project?.clientName || "-")}</div></div>
    </div>
    <div class="dre-table">${rowsHtml}</div>
    <footer class="doc-footer"><div>${esc(studio.studioName)}</div><div>Gerado em ${new Date().toLocaleString("pt-BR")}</div></footer>
  </main>
</body>
</html>`;
}

function DreContent() {
  const [, params] = useRoute("/project/:projectId/dre");
  const projectId = Number(params?.projectId);

  const [report, setReport] = useState<DreReport | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deductions, setDeductions] = useState<DeductionDraft[]>([]);
  const [allocatedMode, setAllocatedMode] = useState<"none" | "fixed" | "percent">("none");
  const [allocatedValueInput, setAllocatedValueInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([api.dre.getReport(projectId), api.projects.get(projectId)])
      .then(([reportData, projectData]) => {
        setReport(reportData);
        setProject(projectData);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar DRE"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const openSettingsDialog = () => {
    if (report && report.deductions.length > 0) {
      setDeductions(
        report.deductions.map((d: DreDeduction) => ({
          name: d.name,
          type: d.type,
          valueInput: d.type === "percent" ? basisPointsToPercentInput(d.value) : (d.value / 100).toFixed(2),
        })),
      );
    } else {
      setDeductions([{ name: "", type: "percent", valueInput: "" }]);
    }
    if (report?.allocatedExpense && report.allocatedExpense > 0) {
      // We don't have direct access to mode/value from the report (only computed amount),
      // so default to fixed with the computed amount when reopening — user can adjust freely.
      setAllocatedMode("fixed");
      setAllocatedValueInput((report.allocatedExpense / 100).toFixed(2));
    } else {
      setAllocatedMode("none");
      setAllocatedValueInput("");
    }
    setSettingsOpen(true);
  };

  const handleAddDeductionRow = () => setDeductions((prev) => [...prev, { name: "", type: "percent", valueInput: "" }]);
  const handleRemoveDeductionRow = (index: number) => setDeductions((prev) => prev.filter((_, i) => i !== index));
  const handleDeductionChange = (index: number, field: keyof DeductionDraft, value: string) => {
    setDeductions((prev) => prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDeductions = deductions
      .filter((d) => d.name.trim())
      .map((d) => ({
        name: d.name.trim(),
        type: d.type,
        value: d.type === "percent" ? parsePercentInput(d.valueInput) : parseCurrencyInput(d.valueInput),
      }));

    const allocatedExpense =
      allocatedMode === "none"
        ? null
        : {
            mode: allocatedMode,
            value: allocatedMode === "percent" ? parsePercentInput(allocatedValueInput) : parseCurrencyInput(allocatedValueInput),
          };

    setSavingSettings(true);
    try {
      await api.dre.updateSettings(projectId, { deductions: parsedDeductions, allocatedExpense });
      toast.success("Configuração do DRE salva");
      setSettingsOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar configuração");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportPdf = () => {
    if (!report) return;
    const studio = readStudioSettings();
    printDreReport(buildDreReportHtml(report, project, studio));
  };

  const isEmpty = report && !report.hasRevenueData && !report.hasBudgetData;
  const currency = report?.currency ?? "BRL";

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <ProjectNav projectId={projectId} />
      <main id="main-content" className="px-4 sm:px-6 py-5 sm:py-6 max-w-[1200px] mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-frame-gray-3 pb-4">
          <div>
            <p className="frame-label mb-1">// Financeiro</p>
            <h1 className="frame-title text-[clamp(1.5rem,3vw,2.2rem)] leading-none">DRE do Projeto</h1>
            <p className="text-xs text-frame-gray-light mt-2 max-w-lg leading-relaxed">
              Demonstrativo de Resultado: receita, deduções, custos diretos e despesas alocadas em um
              relatório formal, pronto para compartilhar com sócios ou contador.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start">
            <button type="button" onClick={openSettingsDialog} className="frame-btn-ghost">
              Configurar deduções
            </button>
            {report && !isEmpty && (
              <button
                type="button"
                onClick={handleExportPdf}
                className="frame-btn-primary inline-flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Exportar PDF
              </button>
            )}
          </div>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
          </div>
        )}

        {/* Empty state — orange square + 01/02/03 flow, same pattern as Budget.tsx */}
        {!loading && isEmpty && (
          <section className="max-w-2xl mx-auto py-10 space-y-8">
            <div className="frame-empty-state p-10 sm:p-12 space-y-6 text-center">
              <div className="w-16 h-16 mx-auto border border-frame-orange/30 bg-frame-orange/10 flex items-center justify-center">
                <FileBarChart className="w-8 h-8 text-frame-orange" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-frame-white">Veja o resultado real do projeto</h2>
                <p className="text-sm text-frame-gray-light max-w-md mx-auto leading-relaxed">
                  Vincule receitas do financeiro a este projeto e defina o orçamento para gerar o
                  demonstrativo de resultado completo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-adaptive-primary tracking-wider block mb-2">01</span>
                <p className="text-sm font-semibold text-frame-white">Vincule receita</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  No Financeiro, vincule lançamentos de receita a este projeto.
                </p>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-adaptive-primary tracking-wider block mb-2">02</span>
                <p className="text-sm font-semibold text-frame-white">Defina orçamento</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  Na aba Orçamento, registre os custos diretos do projeto.
                </p>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-adaptive-primary tracking-wider block mb-2">03</span>
                <p className="text-sm font-semibold text-frame-white">Veja o resultado</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  O DRE calcula o resultado líquido automaticamente.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Report */}
        {!loading && report && !isEmpty && (
          <div className="space-y-4">
            {report.currencyMismatch && (
              <div className="flex items-start gap-2 border border-yellow-500/50 bg-yellow-500/10 text-yellow-400 px-4 py-3 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  O orçamento deste projeto usa uma moeda diferente de BRL. Os valores abaixo não convertem
                  moeda automaticamente — confira antes de compartilhar o relatório.
                </span>
              </div>
            )}

            {!report.hasRevenueData && (
              <div className="flex items-start gap-2 border border-frame-gray-3/60 bg-frame-gray-1/10 px-4 py-3 text-xs text-frame-gray-light">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-frame-orange" />
                <span>Nenhuma receita vinculada a este projeto ainda. Vincule lançamentos no Financeiro.</span>
              </div>
            )}
            {!report.hasBudgetData && (
              <div className="flex items-start gap-2 border border-frame-gray-3/60 bg-frame-gray-1/10 px-4 py-3 text-xs text-frame-gray-light">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-frame-orange" />
                <span>Nenhum orçamento definido para este projeto. Custos diretos exibidos como zero.</span>
              </div>
            )}

            <div className="border border-frame-gray-3/60 divide-y divide-frame-gray-3/60">
              <DreRow label="Receita bruta" value={report.grossRevenue} currency={currency} />
              {report.deductions.map((d) => (
                <DreRow key={d.name} label={`(-) ${d.name}`} value={-d.amount} currency={currency} muted />
              ))}
              <DreRow label="Receita líquida" value={report.netRevenue} currency={currency} emphasis />
              <DreRow label="(-) Custos diretos" value={-report.directCosts} currency={currency} muted />
              <DreRow label="Resultado bruto" value={report.grossResult} currency={currency} emphasis />
              <DreRow label="(-) Despesas alocadas" value={-report.allocatedExpense} currency={currency} muted />
              <DreRow label="Resultado líquido" value={report.netResult} currency={currency} emphasis final />
            </div>
          </div>
        )}
      </main>

      {/* Settings: deductions + allocated expense */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-lg rounded-none p-6 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">Configurar DRE</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Deduções sobre a receita bruta e despesa operacional alocada (estimativa manual, não é um
              lançamento financeiro real).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveSettings} className="space-y-6 mt-4">
            <div className="space-y-2">
              <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-orange">Deduções</p>
              {deductions.map((d, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={d.name}
                    onChange={(e) => handleDeductionChange(index, "name", e.target.value)}
                    placeholder="Ex: Impostos"
                    className="frame-input flex-1"
                  />
                  <select
                    value={d.type}
                    onChange={(e) => handleDeductionChange(index, "type", e.target.value)}
                    className="frame-input w-24"
                  >
                    <option value="percent">%</option>
                    <option value="fixed">R$</option>
                  </select>
                  <input
                    type="text"
                    value={d.valueInput}
                    onChange={(e) => handleDeductionChange(index, "valueInput", e.target.value)}
                    placeholder={d.type === "percent" ? "6" : "0,00"}
                    className="frame-input w-28 font-mono"
                  />
                  {deductions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDeductionRow(index)}
                      className="p-2 border border-frame-gray-3/50 hover:border-red-500 hover:text-red-500 transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddDeductionRow}
                className="frame-btn-ghost inline-flex items-center gap-2 text-xs !py-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar dedução
              </button>
            </div>

            <div className="space-y-2 pt-4 border-t border-frame-gray-3">
              <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-orange">
                Despesa operacional alocada (estimativa manual)
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={allocatedMode}
                  onChange={(e) => setAllocatedMode(e.target.value as "none" | "fixed" | "percent")}
                  className="frame-input w-40"
                >
                  <option value="none">Nenhuma</option>
                  <option value="fixed">Valor fixo (R$)</option>
                  <option value="percent">% da receita</option>
                </select>
                {allocatedMode !== "none" && (
                  <input
                    type="text"
                    value={allocatedValueInput}
                    onChange={(e) => setAllocatedValueInput(e.target.value)}
                    placeholder={allocatedMode === "percent" ? "10" : "0,00"}
                    className="frame-input flex-1 font-mono"
                  />
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button type="button" onClick={() => setSettingsOpen(false)} className="frame-btn-ghost" disabled={savingSettings}>
                Cancelar
              </button>
              <button type="submit" className="frame-btn-primary inline-flex items-center gap-2" disabled={savingSettings}>
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Salvar configuração
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DreRow({
  label,
  value,
  currency,
  emphasis,
  final,
  muted,
}: {
  label: string;
  value: number;
  currency: string;
  emphasis?: boolean;
  final?: boolean;
  muted?: boolean;
}) {
  const isNegative = value < 0;
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${
        final ? "bg-frame-orange/10 border-t-2 border-frame-orange" : emphasis ? "bg-frame-gray-1/10" : ""
      }`}
    >
      <span className={`text-sm ${emphasis ? "font-semibold text-frame-white" : muted ? "text-frame-gray-light" : "text-frame-white"}`}>
        {label}
      </span>
      <span
        className={`text-sm font-mono ${emphasis ? "font-bold" : ""} ${
          isNegative ? "text-red-400" : "text-frame-white"
        }`}
      >
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}

export default function Dre() {
  return (
    <ProtectedRoute>
      <FeatureUpgradeRequired feature="project-dre" variant="full">
        <DreContent />
      </FeatureUpgradeRequired>
    </ProtectedRoute>
  );
}
