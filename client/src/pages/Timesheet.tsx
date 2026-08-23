import { useEffect, useState } from "react";
import AppNavBar from "@/components/AppNavBar";
import EmptyState from "@/components/EmptyState";
import ProductionNav from "@/components/ProductionNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";
import { ScreenDesignPass } from "@/components/discovery/ScreenDesignPass";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTimer } from "@/contexts/TimerContext";
import { api, type TimeEntryItem } from "@/lib/api";
import {
  Clock,
  Play,
  Square,
  Plus,
  Trash2,
  Loader2,
  ArrowRight,
  Calculator,
  Wallet,
  Download,
  SlidersHorizontal,
} from "lucide-react";
import PricingCalculatorModal from "@/components/production/PricingCalculatorModal";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function entryCost(entry: TimeEntryItem): number {
  if (entry.hourly_rate == null) return 0;
  return Math.round((entry.duration_sec / 3600) * entry.hourly_rate);
}

function TimesheetContent() {
  const { t } = useLanguage();
  const { projects } = useProject();
  const {
    activeTimer: running,
    elapsed,
    isStarting: starting,
    isStopping: stopping,
    startTimer,
    stopTimer,
    refreshTimer,
  } = useTimer();
  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [totals, setTotals] = useState({ totalDurationSec: 0, totalCost: 0 });
  const [loading, setLoading] = useState(true);
  const [timerDescription, setTimerDescription] = useState("");
  const [timerProjectId, setTimerProjectId] = useState<number | "">("");
  const [stopHourlyRateInput, setStopHourlyRateInput] = useState("");
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [filterProjectId, setFilterProjectId] = useState<number | "">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [exportingCsv, setExportingCsv] = useState(false);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState<number | null>(null);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualProjectId, setManualProjectId] = useState<number | "">("");
  const [manualDescription, setManualDescription] = useState("");
  const [manualStart, setManualStart] = useState("");
  const [manualEnd, setManualEnd] = useState("");
  const [manualRateInput, setManualRateInput] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TimeEntryItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [sendingBudgetId, setSendingBudgetId] = useState<number | null>(null);
  const [sentBudgetIds, setSentBudgetIds] = useState<Set<number>>(new Set());

  const currentFilters = () => ({
    projectId: filterProjectId ? Number(filterProjectId) : undefined,
    from: filterFrom || undefined,
    to: filterTo || undefined,
  });

  const load = () => {
    setLoading(true);
    api.timesheets
      .list(currentFilters())
      .then((listResult) => {
        setEntries(listResult.entries);
        setTotals(listResult.totals);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar timesheet"))
      .finally(() => setLoading(false));
  };

  const handleResetFilters = () => {
    setFilterProjectId("");
    setFilterFrom("");
    setFilterTo("");
    setLoading(true);
    api.timesheets
      .list()
      .then((listResult) => {
        setEntries(listResult.entries);
        setTotals(listResult.totals);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar timesheet"))
      .finally(() => setLoading(false));
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const response = await api.timesheets.exportCsv(currentFilters());
      if (!response.ok) throw new Error("Falha ao exportar CSV");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "timesheet.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV exportado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao exportar CSV");
    } finally {
      setExportingCsv(false);
    }
  };

  useEffect(() => {
    load();
    api.studioSettings.get().then((data) => {
      setDefaultHourlyRate(data.defaultHourlyRate ?? null);
      if (data.defaultHourlyRate != null) {
        setStopHourlyRateInput(String(data.defaultHourlyRate / 100).replace(".", ","));
        setManualRateInput(String(data.defaultHourlyRate / 100).replace(".", ","));
      }
    }).catch(() => null);
  }, []);

  const handleStart = async () => {
    const created = await startTimer({
      projectId: timerProjectId ? Number(timerProjectId) : null,
      description: timerDescription.trim(),
    });
    if (created) {
      setTimerDescription("");
      void load();
    }
  };

  const handleStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!running) return;
    const hourlyRate = stopHourlyRateInput.trim()
      ? Math.round(Number.parseFloat(stopHourlyRateInput.replace(",", ".")) * 100)
      : defaultHourlyRate ?? undefined;

    const stopped = await stopTimer(hourlyRate ?? null);
    if (stopped) {
      setStopDialogOpen(false);
      setStopHourlyRateInput("");
      load();
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualDescription.trim() || !manualStart || !manualEnd) {
      toast.error("Preencha descrição, início e fim");
      return;
    }
    const hourlyRate = manualRateInput.trim()
      ? Math.round(Number.parseFloat(manualRateInput.replace(",", ".")) * 100)
      : defaultHourlyRate ?? null;

    setSavingManual(true);
    try {
      await api.timesheets.addManualEntry({
        projectId: manualProjectId ? Number(manualProjectId) : null,
        description: manualDescription.trim(),
        startedAt: new Date(manualStart).toISOString(),
        endedAt: new Date(manualEnd).toISOString(),
        hourlyRate,
      });
      toast.success("Registro adicionado");
      setManualOpen(false);
      setManualDescription("");
      setManualStart("");
      setManualEnd("");
      setManualRateInput("");
      load();
      await refreshTimer();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao adicionar registro");
    } finally {
      setSavingManual(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.timesheets.deleteEntry(deleteTarget.id);
      setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success("Registro removido");
      setDeleteTarget(null);
      load();
      await refreshTimer();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover registro");
    } finally {
      setDeleting(false);
    }
  };

  const handleSendToBudget = async (entry: TimeEntryItem) => {
    const projectId = entry.project_id;
    const amount = entryCost(entry);
    if (!projectId || !entry.ended_at || amount <= 0) {
      toast.error("Registro precisa ter projeto, fim e taxa/hora para virar custo");
      return;
    }

    setSendingBudgetId(entry.id);
    try {
      await api.budgets.addEntry(projectId, {
        category: "Equipe",
        description: `Timesheet: ${entry.description || "Horas trabalhadas"} (${formatDuration(entry.duration_sec)})`,
        amount,
        entryDate: new Date(entry.ended_at).toISOString().slice(0, 10),
      });
      setSentBudgetIds((prev) => new Set(prev).add(entry.id));
      toast.success("Horas enviadas para o orçamento");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar horas para orçamento");
    } finally {
      setSendingBudgetId(null);
    }
  };

  const hasEntries = entries.length > 0 || running;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <ProductionNav />
      <main id="main-content" className="px-3 sm:px-6 py-5 sm:py-6 max-w-[1200px] mx-auto space-y-6">
        <ScreenDesignPass
          eyebrow="// Produção"
          title="Horas viram custo real."
          description="Cronometre trabalho por job, estime preço antes de aceitar escopo e envie horas fechadas para o orçamento sem perder contexto."
          icon={Clock}
          currentStage="Produção"
          metrics={[
            { label: "Total de horas", value: formatDuration(totals.totalDurationSec), detail: entries.length ? `${entries.length} registros` : "sem registros" },
            { label: "Custo total", value: formatCurrency(totals.totalCost), detail: "com taxa/hora" },
            { label: "Timer", value: running ? "Ativo" : "Livre", detail: running ? formatDuration(elapsed) : "pronto para iniciar" },
            { label: "Projetos", value: projects.length, detail: "disponíveis" },
          ]}
          actions={[
            { label: "Calcular preço", detail: "Simular diária, margem e pacote", onClick: () => setCalculatorOpen(true) },
            ...(!running ? [{ label: "Registro manual", detail: "Adicionar horas já executadas", onClick: () => setManualOpen(true) }] : []),
          ]}
        />

        {/* Timer widget */}
        <div className="border border-frame-orange/40 bg-frame-orange/[0.06] p-5">
          {running ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-frame-mono text-[0.6rem] uppercase tracking-wide text-adaptive-primary mb-1">
                  Timer em andamento
                </p>
                <p className="text-3xl font-bold font-mono text-frame-white">{formatDuration(elapsed)}</p>
                <p className="text-xs text-frame-gray-light mt-1">{running.description || "Sem descrição"}</p>
              </div>
              <button
                type="button"
                onClick={() => setStopDialogOpen(true)}
                className="frame-btn-primary inline-flex items-center gap-2 !bg-red-600 hover:!bg-red-700 !border-red-600"
              >
                <Square className="w-4 h-4" />
                Parar timer
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input
                type="text"
                value={timerDescription}
                onChange={(e) => setTimerDescription(e.target.value)}
                placeholder="O que você vai fazer?"
                className="frame-input flex-1"
              />
              <select
                value={timerProjectId}
                onChange={(e) => setTimerProjectId(e.target.value ? Number(e.target.value) : "")}
                className="frame-input sm:w-52"
              >
                <option value="">Sem projeto vinculado</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleStart}
                disabled={starting}
                className="frame-btn-primary inline-flex items-center gap-2 shrink-0"
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                Iniciar timer
              </button>
            </div>
          )}
        </div>

        <section className="border border-frame-gray-3/60 bg-frame-gray-1/10 p-4">
          <div className="flex flex-col xl:flex-row xl:items-end gap-3">
            <div className="flex items-center gap-2 xl:w-40">
              <SlidersHorizontal className="w-4 h-4 text-frame-orange" />
              <div>
                <p className="font-frame-mono text-[0.6rem] uppercase tracking-wide text-frame-gray-light">Filtros</p>
                <p className="text-xs text-frame-white">Período e projeto</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
              <label className="block">
                <span className="block text-xs font-medium text-frame-gray-light mb-1.5">Projeto</span>
                <select
                  value={filterProjectId}
                  onChange={(e) => setFilterProjectId(e.target.value ? Number(e.target.value) : "")}
                  className="frame-input w-full"
                >
                  <option value="">Todos os projetos</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-frame-gray-light mb-1.5">De</span>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="frame-input w-full"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-frame-gray-light mb-1.5">Até</span>
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="frame-input w-full"
                />
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 xl:flex gap-2 xl:shrink-0">
              <button type="button" onClick={load} className="frame-btn-primary">
                Aplicar
              </button>
              <button type="button" onClick={handleResetFilters} className="frame-btn-ghost">
                Limpar
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={exportingCsv}
                className="frame-btn-ghost inline-flex items-center justify-center gap-2"
              >
                {exportingCsv ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                CSV
              </button>
            </div>
          </div>
        </section>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
          </div>
        )}

        {/* Empty state — orange square + 01/02/03 flow */}
        {!loading && !hasEntries && (
          <section className="mx-auto max-w-4xl py-6">
            <EmptyState
              icon={Clock}
              eyebrow={t("app.timesheet.onboardEyebrow")}
              title={t("app.timesheet.onboardTitle")}
              description={t("app.timesheet.onboardDesc")}
              steps={[
                { title: t("app.timesheet.onboardStep1"), description: t("app.timesheet.onboardStep1Desc") },
                { title: t("app.timesheet.onboardStep2"), description: t("app.timesheet.onboardStep2Desc") },
                { title: t("app.timesheet.onboardStep3"), description: t("app.timesheet.onboardStep3Desc") },
              ]}
            />
          </section>
        )}

        {/* Totals + ledger */}
        {!loading && entries.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-frame-gray-3/60 bg-frame-gray-1/10 p-4">
                <p className="font-frame-mono text-[0.6rem] uppercase tracking-wide text-frame-gray-light mb-1">Total de horas</p>
                <p className="text-xl font-bold text-frame-white font-mono">{formatDuration(totals.totalDurationSec)}</p>
              </div>
              <div className="border border-frame-gray-3/60 bg-frame-gray-1/10 p-4">
                <p className="font-frame-mono text-[0.6rem] uppercase tracking-wide text-frame-gray-light mb-1">Custo total</p>
                <p className="text-xl font-bold text-frame-white">{formatCurrency(totals.totalCost)}</p>
              </div>
            </div>

            <div className="space-y-2">
              {entries.map((entry) => {
                const project = projects.find((p) => p.id === entry.project_id);
                const cost = entryCost(entry);
                const canSendToBudget = Boolean(entry.project_id && entry.ended_at && cost > 0);
                const isSendingBudget = sendingBudgetId === entry.id;
                const wasSentBudget = sentBudgetIds.has(entry.id);
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between border border-frame-gray-3/50 bg-frame-gray-1/10 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-frame-white truncate">{entry.description || "Sem descrição"}</p>
                      <p className="text-[0.65rem] text-frame-gray-light">
                        {project?.name ?? entry.project_name ?? "Sem projeto"} · {new Date(entry.started_at).toLocaleDateString("pt-BR")}
                        {!entry.ended_at && <span className="text-frame-orange ml-1">· em andamento</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-mono text-frame-white">{formatDuration(entry.duration_sec)}</span>
                      {entry.hourly_rate != null && (
                        <span className="text-xs text-frame-gray-light">
                          {formatCurrency(cost)}
                        </span>
                      )}
                      {canSendToBudget && (
                        <button
                          type="button"
                          onClick={() => handleSendToBudget(entry)}
                          disabled={isSendingBudget || wasSentBudget}
                          className="inline-flex items-center gap-1.5 border border-frame-orange/30 px-2.5 py-1.5 text-[0.65rem] font-semibold text-frame-orange transition hover:border-frame-orange hover:bg-frame-orange/10 disabled:cursor-not-allowed disabled:opacity-55 max-md:min-h-11"
                          title="Enviar horas para orçamento"
                        >
                          {isSendingBudget ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                          {wasSentBudget ? "Enviado" : "Orçamento"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(entry)}
                        className="p-1.5 max-md:min-h-11 max-md:min-w-11 max-md:flex max-md:items-center max-md:justify-center border border-frame-gray-3/50 hover:border-red-500 hover:text-red-500 transition"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <PricingCalculatorModal open={calculatorOpen} onOpenChange={setCalculatorOpen} />

      {/* Stop timer — optional hourly rate */}
      <Dialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">Parar timer</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Informe a taxa/hora (opcional) para calcular o custo automaticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStop} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Taxa/hora (opcional)</label>
              <input
                type="text"
                value={stopHourlyRateInput}
                onChange={(e) => setStopHourlyRateInput(e.target.value)}
                placeholder={defaultHourlyRate != null ? String(defaultHourlyRate / 100).replace(".", ",") : "0,00"}
                className="frame-input w-full font-mono"
              />
            </div>
            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button type="button" onClick={() => setStopDialogOpen(false)} className="frame-btn-ghost" disabled={stopping}>
                Cancelar
              </button>
              <button type="submit" className="frame-btn-primary inline-flex items-center gap-2" disabled={stopping}>
                {stopping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                Parar timer
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Manual entry */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-lg rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">Registro manual</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Registre horas trabalhadas sem usar o timer.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddManual} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Descrição</label>
              <input
                type="text"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="Ex: Edição final"
                required
                className="frame-input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Projeto (opcional)</label>
              <select
                value={manualProjectId}
                onChange={(e) => setManualProjectId(e.target.value ? Number(e.target.value) : "")}
                className="frame-input w-full"
              >
                <option value="">Sem projeto vinculado</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Início</label>
                <input
                  type="datetime-local"
                  value={manualStart}
                  onChange={(e) => setManualStart(e.target.value)}
                  required
                  className="frame-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Fim</label>
                <input
                  type="datetime-local"
                  value={manualEnd}
                  onChange={(e) => setManualEnd(e.target.value)}
                  required
                  className="frame-input w-full"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Taxa/hora (opcional)</label>
              <input
                type="text"
                value={manualRateInput}
                onChange={(e) => setManualRateInput(e.target.value)}
                placeholder={defaultHourlyRate != null ? String(defaultHourlyRate / 100).replace(".", ",") : "0,00"}
                className="frame-input w-full font-mono"
              />
            </div>
            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button type="button" onClick={() => setManualOpen(false)} className="frame-btn-ghost" disabled={savingManual}>
                Cancelar
              </button>
              <button type="submit" className="frame-btn-primary inline-flex items-center gap-2" disabled={savingManual}>
                {savingManual ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Adicionar registro
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.description || "Registro sem descrição"}" será removido e os totais recalculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Timesheet() {
  return (
    <ProtectedRoute>
      <FeatureUpgradeRequired feature="timesheet" variant="full">
        <TimesheetContent />
      </FeatureUpgradeRequired>
    </ProtectedRoute>
  );
}
