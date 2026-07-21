import { useEffect, useRef, useState } from "react";
import AppNavBar from "@/components/AppNavBar";
import ProductionNav from "@/components/ProductionNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";
import { useProject } from "@/contexts/ProjectContext";
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

function TimesheetContent() {
  const { projects } = useProject();
  const [entries, setEntries] = useState<TimeEntryItem[]>([]);
  const [totals, setTotals] = useState({ totalDurationSec: 0, totalCost: 0 });
  const [running, setRunning] = useState<TimeEntryItem | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [timerDescription, setTimerDescription] = useState("");
  const [timerProjectId, setTimerProjectId] = useState<number | "">("");
  const [stopHourlyRateInput, setStopHourlyRateInput] = useState("");
  const [stopDialogOpen, setStopDialogOpen] = useState(false);

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

  const tickRef = useRef<number | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([api.timesheets.list(), api.timesheets.getRunning()])
      .then(([listResult, runningResult]) => {
        setEntries(listResult.entries);
        setTotals(listResult.totals);
        setRunning(runningResult);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar timesheet"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!running) {
      setElapsed(0);
      return;
    }
    const startedAt = new Date(running.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    tickRef.current = window.setInterval(tick, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, [running]);

  const handleStart = async () => {
    setStarting(true);
    try {
      const created = await api.timesheets.start({
        projectId: timerProjectId ? Number(timerProjectId) : null,
        description: timerDescription.trim(),
      });
      setRunning(created);
      setTimerDescription("");
      toast.success("Timer iniciado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao iniciar timer");
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!running) return;
    const hourlyRate = stopHourlyRateInput.trim()
      ? Math.round(Number.parseFloat(stopHourlyRateInput.replace(",", ".")) * 100)
      : undefined;

    setStopping(true);
    try {
      await api.timesheets.stop(running.id, hourlyRate ?? null);
      setRunning(null);
      setStopDialogOpen(false);
      setStopHourlyRateInput("");
      toast.success("Timer parado");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao parar timer");
    } finally {
      setStopping(false);
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
      : null;

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover registro");
    } finally {
      setDeleting(false);
    }
  };

  const hasEntries = entries.length > 0 || running;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <ProductionNav />
      <main id="main-content" className="px-4 sm:px-6 py-5 sm:py-6 max-w-[1200px] mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-frame-gray-3 pb-4">
          <div>
            <p className="frame-label mb-1">// Produção</p>
            <h1 className="frame-title text-[clamp(1.5rem,3vw,2.2rem)] leading-none">Timesheet</h1>
            <p className="text-xs text-frame-gray-light mt-2 max-w-lg leading-relaxed">
              Cronometre horas trabalhadas por projeto e calcule o custo real com base na taxa horária.
              Use a calculadora de preço para estimar quanto cobrar antes de aceitar um trabalho.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start">
            <button
              type="button"
              onClick={() => setCalculatorOpen(true)}
              className="frame-btn-ghost inline-flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              Calculadora de preço
            </button>
            {!running && (
              <button
                type="button"
                onClick={() => setManualOpen(true)}
                className="frame-btn-ghost inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Registro manual
              </button>
            )}
          </div>
        </header>

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

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
          </div>
        )}

        {/* Empty state — orange square + 01/02/03 flow */}
        {!loading && !hasEntries && (
          <section className="max-w-2xl mx-auto py-6 space-y-8">
            <div className="frame-empty-state p-10 sm:p-12 space-y-6 text-center">
              <div className="w-16 h-16 mx-auto border border-frame-orange/30 bg-frame-orange/10 flex items-center justify-center">
                <Clock className="w-8 h-8 text-frame-orange" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-frame-white">Registre suas horas de trabalho</h2>
                <p className="text-sm text-frame-gray-light max-w-md mx-auto leading-relaxed">
                  Inicie o timer acima quando começar a trabalhar, ou adicione um registro manual com
                  horário de início e fim.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-adaptive-primary tracking-wider block mb-2">01</span>
                <p className="text-sm font-semibold text-frame-white">Inicie timer</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  Descreva a tarefa e inicie o cronômetro.
                </p>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-adaptive-primary tracking-wider block mb-2">02</span>
                <p className="text-sm font-semibold text-frame-white">Vincule projeto</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  Associe o tempo a um projeto para o custo entrar no relatório certo.
                </p>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-adaptive-primary tracking-wider block mb-2">03</span>
                <p className="text-sm font-semibold text-frame-white">Veja horas e custo</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  Defina a taxa/hora ao parar e o custo é calculado automaticamente.
                </p>
              </div>
            </div>
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
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between border border-frame-gray-3/50 bg-frame-gray-1/10 px-4 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-frame-white truncate">{entry.description || "Sem descrição"}</p>
                      <p className="text-[0.65rem] text-frame-gray-light">
                        {project?.name ?? "Sem projeto"} · {new Date(entry.started_at).toLocaleDateString("pt-BR")}
                        {!entry.ended_at && <span className="text-frame-orange ml-1">· em andamento</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-mono text-frame-white">{formatDuration(entry.duration_sec)}</span>
                      {entry.hourly_rate != null && (
                        <span className="text-xs text-frame-gray-light">
                          {formatCurrency(Math.round((entry.duration_sec / 3600) * entry.hourly_rate))}
                        </span>
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
                placeholder="0,00"
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
                placeholder="0,00"
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
