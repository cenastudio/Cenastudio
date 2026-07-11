import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { FeatureUpgradeRequired } from "@/components/FeatureUpgradeRequired";
import { api, type BudgetOverview, type BudgetEntryItem } from "@/lib/api";
import {
  Wallet,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
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

interface CategoryDraft {
  name: string;
  budgetedInput: string;
}

function BudgetContent() {
  const [, params] = useRoute("/project/:projectId/budget");
  const projectId = Number(params?.projectId);

  const [overview, setOverview] = useState<BudgetOverview | null>(null);
  const [entries, setEntries] = useState<BudgetEntryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [baselineOpen, setBaselineOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryDraft[]>([{ name: "", budgetedInput: "" }]);
  const [currency, setCurrency] = useState("BRL");
  const [savingBaseline, setSavingBaseline] = useState(false);

  const [entryOpen, setEntryOpen] = useState(false);
  const [entryCategory, setEntryCategory] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryAmountInput, setEntryAmountInput] = useState("");
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [savingEntry, setSavingEntry] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BudgetEntryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    if (!projectId) return;
    setLoading(true);
    api.budgets
      .getOverview(projectId)
      .then((data) => {
        setOverview(data);
        // byCategory doubles as the entry list source for now — refetch entries via a
        // lightweight overview-only view isn't enough for the ledger, so we track
        // entries locally as they're added/removed in this session plus a full
        // reload triggers overview only (entries list comes from mutations below).
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Falha ao carregar orçamento"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const openBaselineDialog = () => {
    if (overview && overview.byCategory.length > 0) {
      setCategories(
        overview.byCategory.map((c) => ({ name: c.name, budgetedInput: (c.budgeted / 100).toFixed(2) })),
      );
      setCurrency(overview.currency);
    } else {
      setCategories([{ name: "", budgetedInput: "" }]);
    }
    setBaselineOpen(true);
  };

  const handleAddCategoryRow = () => setCategories((prev) => [...prev, { name: "", budgetedInput: "" }]);
  const handleRemoveCategoryRow = (index: number) => setCategories((prev) => prev.filter((_, i) => i !== index));
  const handleCategoryChange = (index: number, field: keyof CategoryDraft, value: string) => {
    setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCategories = categories
      .filter((c) => c.name.trim())
      .map((c) => ({ name: c.name.trim(), budgeted: parseCurrencyInput(c.budgetedInput) }));

    if (parsedCategories.length === 0) {
      toast.error("Adicione ao menos uma categoria com orçamento");
      return;
    }

    setSavingBaseline(true);
    try {
      const totalAmount = parsedCategories.reduce((sum, c) => sum + c.budgeted, 0);
      await api.budgets.updateBaseline(projectId, { totalAmount, currency, categories: parsedCategories });
      toast.success("Orçamento salvo");
      setBaselineOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar orçamento");
    } finally {
      setSavingBaseline(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseCurrencyInput(entryAmountInput);
    if (!entryCategory.trim() || !entryDescription.trim() || amount <= 0 || !entryDate) {
      toast.error("Preencha categoria, descrição, valor e data");
      return;
    }
    setSavingEntry(true);
    try {
      const created = await api.budgets.addEntry(projectId, {
        category: entryCategory.trim(),
        description: entryDescription.trim(),
        amount,
        entryDate,
      });
      setEntries((prev) => [created, ...prev]);
      toast.success("Gasto lançado");
      setEntryOpen(false);
      setEntryCategory("");
      setEntryDescription("");
      setEntryAmountInput("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao lançar gasto");
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.budgets.deleteEntry(deleteTarget.id);
      setEntries((prev) => prev.filter((e) => e.id !== deleteTarget.id));
      toast.success("Lançamento removido");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao remover lançamento");
    } finally {
      setDeleting(false);
    }
  };

  const hasBaseline = overview && overview.byCategory.length > 0;
  const currencyForDisplay = overview?.currency ?? "BRL";

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />
      <ProjectNav projectId={projectId} />
      <main id="main-content" className="px-4 sm:px-6 py-5 sm:py-6 max-w-[1200px] mx-auto space-y-6">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-frame-gray-3 pb-4">
          <div>
            <p className="frame-label mb-1">// Financeiro</p>
            <h1 className="frame-title text-[clamp(1.5rem,3vw,2.2rem)] leading-none">Orçamento</h1>
            <p className="text-xs text-frame-gray-light mt-2 max-w-lg leading-relaxed">
              Defina o orçamento por categoria e lance os gastos reais para saber, em tempo real, se o
              projeto está dentro do previsto.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-start">
            <button type="button" onClick={openBaselineDialog} className="frame-btn-ghost">
              {hasBaseline ? "Editar orçamento" : "Definir orçamento"}
            </button>
            {hasBaseline && (
              <button
                type="button"
                onClick={() => setEntryOpen(true)}
                className="frame-btn-primary inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Lançar gasto
              </button>
            )}
          </div>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
          </div>
        )}

        {/* Empty state — orange square + 01/02/03 flow, same pattern as Webhooks/Documents */}
        {!loading && !hasBaseline && (
          <section className="max-w-2xl mx-auto py-10 space-y-8">
            <div className="frame-empty-state p-10 sm:p-12 space-y-6 text-center">
              <div className="w-16 h-16 mx-auto border border-frame-orange/30 bg-frame-orange/10 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-frame-orange" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-frame-white">Controle o orçamento do projeto</h2>
                <p className="text-sm text-frame-gray-light max-w-md mx-auto leading-relaxed">
                  Defina quanto pode gastar em cada categoria (equipe, equipamento, locação...) e lance os
                  gastos reais conforme acontecem. Você vê na hora se está no azul ou no vermelho.
                </p>
              </div>
              <button
                type="button"
                onClick={openBaselineDialog}
                className="frame-btn-primary inline-flex items-center gap-2 !py-3 !px-6"
              >
                <Plus className="w-4 h-4" />
                Definir orçamento
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-frame-orange tracking-wider block mb-2">01</span>
                <p className="text-sm font-semibold text-frame-white">Defina orçamento</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  Valor previsto por categoria (Equipe, Equipamento, Locação...).
                </p>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-frame-orange tracking-wider block mb-2">02</span>
                <p className="text-sm font-semibold text-frame-white">Lance gastos</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  Cada despesa real entra na categoria certa, com data e descrição.
                </p>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.08] p-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-0.5 bg-frame-orange" />
                <span className="font-frame-mono text-[0.6rem] text-frame-orange tracking-wider block mb-2">03</span>
                <p className="text-sm font-semibold text-frame-white">Previsto vs realizado</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1 leading-relaxed">
                  Barras de progresso e alertas automáticos quando uma categoria estoura.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Overview — budgeted vs actual per category */}
        {!loading && hasBaseline && overview && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="border border-frame-gray-3/60 bg-frame-gray-1/10 p-4">
                <p className="font-frame-mono text-[0.6rem] uppercase tracking-wide text-frame-gray-light mb-1">Orçado</p>
                <p className="text-xl font-bold text-frame-white">{formatCurrency(overview.totalBudgeted, currencyForDisplay)}</p>
              </div>
              <div className="border border-frame-gray-3/60 bg-frame-gray-1/10 p-4">
                <p className="font-frame-mono text-[0.6rem] uppercase tracking-wide text-frame-gray-light mb-1">Realizado</p>
                <p className="text-xl font-bold text-frame-white">{formatCurrency(overview.totalSpent, currencyForDisplay)}</p>
              </div>
              <div className="border border-frame-gray-3/60 bg-frame-gray-1/10 p-4">
                <p className="font-frame-mono text-[0.6rem] uppercase tracking-wide text-frame-gray-light mb-1">Saldo</p>
                <p
                  className={`text-xl font-bold ${
                    overview.totalBudgeted - overview.totalSpent < 0 ? "text-red-400" : "text-frame-white"
                  }`}
                >
                  {formatCurrency(overview.totalBudgeted - overview.totalSpent, currencyForDisplay)}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {overview.byCategory.map((cat) => {
                const alert = overview.alerts.find((a) => a.category === cat.name);
                const pct = Math.min(cat.pct, 1);
                const barColor =
                  alert?.level === "over" ? "bg-red-500" : alert?.level === "warn" ? "bg-yellow-500" : "bg-frame-orange";
                return (
                  <div key={cat.name} className="border border-frame-gray-3/60 bg-frame-gray-1/10 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-frame-white flex items-center gap-2">
                        {cat.name}
                        {alert && (
                          <span
                            className={`inline-flex items-center gap-1 text-[0.6rem] font-frame-mono uppercase px-1.5 py-0.5 border ${
                              alert.level === "over"
                                ? "border-red-500/50 text-red-400"
                                : "border-yellow-500/50 text-yellow-400"
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {alert.level === "over" ? "Estourado" : "Atenção"}
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-frame-gray-light font-mono">
                        {formatCurrency(cat.spent, currencyForDisplay)} / {formatCurrency(cat.budgeted, currencyForDisplay)}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-frame-gray-3/40 overflow-hidden">
                      <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ledger of entries added this session (server is source of truth on reload) */}
            {entries.length > 0 && (
              <div className="space-y-2">
                <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-orange">
                  Lançamentos recentes
                </p>
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between border border-frame-gray-3/50 bg-frame-gray-1/10 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-frame-white truncate">{entry.description}</p>
                      <p className="text-[0.65rem] text-frame-gray-light">
                        {entry.category} · {new Date(entry.entry_date).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-mono text-frame-white">{formatCurrency(entry.amount, currencyForDisplay)}</span>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(entry)}
                        className="p-1.5 border border-frame-gray-3/50 hover:border-red-500 hover:text-red-500 transition"
                        title="Excluir lançamento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Define/edit baseline */}
      <Dialog open={baselineOpen} onOpenChange={setBaselineOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-lg rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">Orçamento por categoria</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Defina quanto está previsto para cada categoria de gasto do projeto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBaseline} className="space-y-4 mt-4">
            <div className="space-y-2">
              {categories.map((cat, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => handleCategoryChange(index, "name", e.target.value)}
                    placeholder="Ex: Equipe"
                    className="frame-input flex-1"
                  />
                  <input
                    type="text"
                    value={cat.budgetedInput}
                    onChange={(e) => handleCategoryChange(index, "budgetedInput", e.target.value)}
                    placeholder="0,00"
                    className="frame-input w-32 font-mono"
                  />
                  {categories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCategoryRow(index)}
                      className="p-2 border border-frame-gray-3/50 hover:border-red-500 hover:text-red-500 transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddCategoryRow}
                className="frame-btn-ghost inline-flex items-center gap-2 text-xs !py-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar categoria
              </button>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button type="button" onClick={() => setBaselineOpen(false)} className="frame-btn-ghost" disabled={savingBaseline}>
                Cancelar
              </button>
              <button type="submit" className="frame-btn-primary inline-flex items-center gap-2" disabled={savingBaseline}>
                {savingBaseline ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Salvar orçamento
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add spend entry */}
      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-lg rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">Lançar gasto</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Registre uma despesa real do projeto.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddEntry} className="space-y-4 mt-4">
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Categoria</label>
              <input
                type="text"
                value={entryCategory}
                onChange={(e) => setEntryCategory(e.target.value)}
                placeholder="Ex: Equipe"
                required
                className="frame-input w-full"
                list="budget-categories"
              />
              <datalist id="budget-categories">
                {overview?.byCategory.map((c) => (
                  <option key={c.name} value={c.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Descrição</label>
              <input
                type="text"
                value={entryDescription}
                onChange={(e) => setEntryDescription(e.target.value)}
                placeholder="Ex: Diária cinegrafista"
                required
                className="frame-input w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Valor</label>
                <input
                  type="text"
                  value={entryAmountInput}
                  onChange={(e) => setEntryAmountInput(e.target.value)}
                  placeholder="0,00"
                  required
                  className="frame-input w-full font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-frame-gray-light mb-1.5">Data</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  required
                  className="frame-input w-full"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button type="button" onClick={() => setEntryOpen(false)} className="frame-btn-ghost" disabled={savingEntry}>
                Cancelar
              </button>
              <button type="submit" className="frame-btn-primary inline-flex items-center gap-2" disabled={savingEntry}>
                {savingEntry ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Lançar gasto
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.description}" será removido e o realizado será recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Budget() {
  return (
    <ProtectedRoute>
      <FeatureUpgradeRequired feature="budget-tracking" variant="full">
        <BudgetContent />
      </FeatureUpgradeRequired>
    </ProtectedRoute>
  );
}
