import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarClock,
  Check,
  CircleDollarSign,
  Download,
  Plus,
  Receipt,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface OverallAnalytics {
  projects: { total: number; active: number };
  clients: { total: number; totalValue: number };
  pipeline: { totalOpportunities: number; pipelineValue: number; wonThisMonth: number };
}

interface FinancialEntry {
  id: number;
  client_id: number | null;
  client_name?: string | null;
  client_company?: string | null;
  kind: "income" | "expense";
  description: string;
  category: string;
  amount: number;
  status: "pending" | "settled" | "canceled";
  due_date: string | null;
  paid_at: string | null;
  recurrence: "once" | "monthly";
  is_fixed: number;
  created_at: string;
}

interface FinanceOverview {
  summary: {
    receivedMonth: number;
    expensesMonth: number;
    profitMonth: number;
    toReceive: number;
    toPay: number;
    fixedMonthly: number;
    recurringRevenue: number;
    overdueReceivables: number;
    lossesMonth: number;
    openPipeline: number;
    weightedPipeline: number;
    crmOpenValue: number;
    crmWeightedValue: number;
    recurringClients: number;
  };
  monthlyCashflow: Array<{ month: string; income: number; expenses: number }>;
  revenueSources: Array<{ category: string; amount: number; count: number }>;
  topClients: Array<{ id: number; name: string; company: string | null; revenue: number }>;
  pendingEntries: FinancialEntry[];
  recentEntries: FinancialEntry[];
}

interface ClientOption {
  id: number;
  name: string;
  company?: string | null;
}

interface EntryForm {
  kind: "income" | "expense";
  description: string;
  category: string;
  amount: string;
  status: "pending" | "settled";
  dueDate: string;
  recurrence: "once" | "monthly";
  clientId: string;
  isFixed: boolean;
}

const initialEntry: EntryForm = {
  kind: "income",
  description: "",
  category: "projeto",
  amount: "",
  status: "pending",
  dueDate: "",
  recurrence: "once",
  clientId: "",
  isFixed: false,
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value: string | null, noDateLabel: string) => {
  if (!value) return noDateLabel;
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR");
};

const monthLabel = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" })
    .format(new Date(year, month - 1, 1))
    .replace(".", "");
};

function AnalyticsContent() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [overall, setOverall] = useState<OverallAnalytics | null>(null);
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [entry, setEntry] = useState<EntryForm>(initialEntry);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadAnalytics = useCallback(async () => {
    try {
      setRefreshing(true);
      const [overallRes, financeRes, clientsRes] = await Promise.all([
        fetch("/api/analytics-overall", { credentials: "include" }),
        fetch("/api/analytics/finance", { credentials: "include" }),
        fetch("/api/clients", { credentials: "include" }),
      ]);

      const [overallData, financeData, clientsData] = await Promise.all([
        overallRes.json(),
        financeRes.json(),
        clientsRes.json(),
      ]);

      if (overallData.success) setOverall(overallData.data);
      if (financeData.success) setFinance(financeData.data);
      if (clientsData.success) setClients(Array.isArray(clientsData.data) ? clientsData.data : []);
      if (!financeData.success) throw new Error(financeData.error || "Erro ao carregar financeiro");
    } catch (error) {
      console.error(error);
      toast.error(t("app.errors.loadFinance"));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (!showEntryForm) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowEntryForm(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showEntryForm]);

  const maxCashflow = useMemo(() => {
    if (!finance?.monthlyCashflow.length) return 1;
    return Math.max(
      1,
      ...finance.monthlyCashflow.flatMap((item) => [item.income, item.expenses]),
    );
  }, [finance]);

  const submitEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!entry.description.trim() || !Number(entry.amount)) {
      toast.error(t("app.errors.fillDescriptionAndAmount"));
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/analytics/finance/entries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...entry,
          amount: Number(entry.amount),
          clientId: entry.clientId ? Number(entry.clientId) : null,
          paidAt: entry.status === "settled" ? new Date().toISOString().slice(0, 10) : null,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || t("app.errors.saveEntry"));
      setEntry(initialEntry);
      setShowEntryForm(false);
      toast.success(t("app.analytics.entryRegistered"));
      await loadAnalytics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.errors.saveEntry"));
    } finally {
      setIsSaving(false);
    }
  };

  const settleEntry = async (id: number) => {
    try {
      const response = await fetch(`/api/analytics/finance/entries/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "settled" }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || t("app.errors.updateEntry"));
      toast.success(t("app.analytics.paymentConfirmed"));
      await loadAnalytics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.errors.updateEntry"));
    }
  };

  const deleteEntry = async (id: number) => {
    if (!window.confirm(t("app.analytics.confirmDeleteEntry"))) return;
    try {
      const response = await fetch(`/api/analytics/finance/entries/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || t("app.errors.deleteEntry"));
      toast.success(t("app.analytics.entryDeleted"));
      await loadAnalytics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.errors.deleteEntry"));
    }
  };

  const exportPipeline = () => {
    window.open("/api/export-pipeline?format=csv", "_blank");
  };

  const summary = finance?.summary;
  const erpLanes = summary
    ? [
        {
          label: "Contas a receber",
          value: formatCurrency(summary.toReceive),
          detail: `${formatCurrency(summary.overdueReceivables)} vencido`,
        },
        {
          label: "Contas a pagar",
          value: formatCurrency(summary.toPay),
          detail: `${formatCurrency(summary.fixedMonthly)} fixo mensal`,
        },
        {
          label: "Receita recorrente",
          value: formatCurrency(summary.recurringRevenue),
          detail: `${summary.recurringClients} cliente(s) recorrente(s)`,
        },
        {
          label: "Previsão de novos jobs",
          value: formatCurrency(summary.weightedPipeline),
          detail: `${formatCurrency(summary.openPipeline)} em conversas abertas`,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />

      <main id="main-content" className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 sm:py-9">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="frame-label mb-2">// {t("app.analytics.eyebrow")}</p>
            <h1 className="frame-title text-[clamp(2.3rem,4.4vw,4.2rem)]">{t("app.analytics.financeTitle")}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-frame-gray-light">
              {t("app.analytics.financeDescription")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setLocation("/pipeline")} className="frame-btn-ghost inline-flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Pipeline
            </button>
            <button type="button" onClick={exportPipeline} className="frame-btn-ghost inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              CSV
            </button>
            <button
              type="button"
              onClick={loadAnalytics}
              disabled={refreshing}
              className="frame-btn-ghost inline-flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {t("app.common.refresh")}
            </button>
            <button
              type="button"
              onClick={() => setShowEntryForm(true)}
              className="frame-btn-primary inline-flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("app.analytics.newEntry")}
            </button>
          </div>
        </header>

        {showEntryForm && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <button
              type="button"
              aria-label={t("app.common.close")}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setShowEntryForm(false)}
            />

            <div className="relative mx-auto flex min-h-full w-full max-w-5xl items-center px-4 py-6 sm:py-10">
              <form
                onSubmit={submitEntry}
                className="relative w-full overflow-hidden border border-frame-gray-3 bg-[rgba(12,8,7,0.97)] p-5 shadow-[0_26px_120px_rgba(0,0,0,0.68)] sm:p-7"
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,78,0,0.18),transparent_38%)]" aria-hidden="true" />

                <div className="relative space-y-6">
                  <div className="flex flex-col gap-4 border-b border-frame-gray-3 pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="frame-label">// {t("app.analytics.registerMovement")}</p>
                      <h2 className="frame-title mt-2 text-[clamp(2rem,4vw,3.8rem)] leading-none">{t("app.analytics.newEntry")}</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-frame-gray-light">
                        {t("app.analytics.newEntryDescription")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowEntryForm(false)}
                      className="frame-btn-ghost inline-flex items-center justify-center gap-2 self-start"
                    >
                      <X className="h-4 w-4" />
                      {t("app.common.close")}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="frame-label text-frame-gray-light">{t("app.analytics.movementType")}</span>
                      <div className="grid grid-cols-2 border border-frame-gray-3 bg-frame-gray-1/50">
                        {(["income", "expense"] as const).map((kind) => (
                          <button
                            key={kind}
                            type="button"
                            onClick={() => setEntry((current) => ({ ...current, kind }))}
                            className={`min-h-12 px-3 text-xs font-semibold transition ${
                              entry.kind === kind
                                ? kind === "income"
                                  ? "bg-green-500/14 text-green-400"
                                  : "bg-red-500/14 text-red-400"
                                : "text-frame-gray-light hover:text-frame-white"
                            }`}
                          >
                            {kind === "income" ? t("app.analytics.income") : t("app.analytics.expense")}
                          </button>
                        ))}
                      </div>
                    </label>

                    <label className="space-y-2">
                      <span className="frame-label text-frame-gray-light">{t("app.common.description")}</span>
                      <input
                        className="frame-input w-full"
                        value={entry.description}
                        onChange={(event) => setEntry((current) => ({ ...current, description: event.target.value }))}
                        placeholder={t("app.analytics.descriptionPlaceholder")}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="frame-label text-frame-gray-light">{t("app.common.value")}</span>
                      <input
                        className="frame-input w-full"
                        type="number"
                        min="1"
                        step="0.01"
                        value={entry.amount}
                        onChange={(event) => setEntry((current) => ({ ...current, amount: event.target.value }))}
                        placeholder={t("app.analytics.amountPlaceholder")}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="frame-label text-frame-gray-light">{t("app.analytics.category")}</span>
                      <select
                        className="frame-input w-full"
                        value={entry.category}
                        onChange={(event) => setEntry((current) => ({ ...current, category: event.target.value }))}
                      >
                        <option value="projeto">{t("app.analytics.categoryProject")}</option>
                        <option value="mensalidade">{t("app.analytics.categorySubscription")}</option>
                        <option value="equipe">{t("app.analytics.categoryCrew")}</option>
                        <option value="equipamento">{t("app.analytics.categoryEquipment")}</option>
                        <option value="software">{t("app.analytics.categorySoftware")}</option>
                        <option value="impostos">{t("app.analytics.categoryTaxes")}</option>
                        <option value="estrutura">{t("app.analytics.categoryStructure")}</option>
                        <option value="outros">{t("app.analytics.categoryOther")}</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="frame-label text-frame-gray-light">{t("app.analytics.client")}</span>
                      <select
                        className="frame-input w-full"
                        value={entry.clientId}
                        onChange={(event) => setEntry((current) => ({ ...current, clientId: event.target.value }))}
                      >
                        <option value="">{t("app.analytics.noClientLinked")}</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name}{client.company ? ` · ${client.company}` : ""}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="frame-label text-frame-gray-light">{t("app.analytics.dueDate")}</span>
                      <input
                        className="frame-input w-full"
                        type="date"
                        value={entry.dueDate}
                        onChange={(event) => setEntry((current) => ({ ...current, dueDate: event.target.value }))}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="frame-label text-frame-gray-light">{t("app.analytics.status")}</span>
                      <select
                        className="frame-input w-full"
                        value={entry.status}
                        onChange={(event) => setEntry((current) => ({ ...current, status: event.target.value as EntryForm["status"] }))}
                      >
                        <option value="pending">{t("app.common.pending")}</option>
                        <option value="settled">{entry.kind === "income" ? t("app.analytics.received") : t("app.analytics.paid")}</option>
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className="frame-label text-frame-gray-light">{t("app.analytics.recurrence")}</span>
                      <select
                        className="frame-input w-full"
                        value={entry.recurrence}
                        onChange={(event) => setEntry((current) => ({ ...current, recurrence: event.target.value as EntryForm["recurrence"] }))}
                      >
                        <option value="once">{t("app.analytics.once")}</option>
                        <option value="monthly">{t("app.analytics.monthly")}</option>
                      </select>
                    </label>

                    <label className="flex min-h-12 items-center gap-3 border border-frame-gray-3 bg-frame-gray-1/50 px-4 text-sm text-frame-gray-light">
                      <input
                        type="checkbox"
                        checked={entry.isFixed}
                        onChange={(event) => setEntry((current) => ({ ...current, isFixed: event.target.checked }))}
                      />
                      {t("app.analytics.fixedValue")}
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-frame-gray-3 pt-5 sm:flex-row sm:items-center sm:justify-end">
                    <button type="button" onClick={() => setShowEntryForm(false)} className="frame-btn-ghost">
                      {t("app.common.cancel")}
                    </button>
                    <button type="submit" disabled={isSaving} className="frame-btn-primary">
                      {isSaving ? t("app.common.saving") : t("app.analytics.saveEntry")}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {isLoading || !summary ? (
          <div className="flex min-h-64 items-center justify-center">
            <RefreshCw className="h-7 w-7 animate-spin text-frame-orange" />
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-3 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="app-panel p-5 sm:p-6">
                <p className="frame-label">// FINANCEIRO DO ESTÚDIO</p>
                <h2 className="mt-2 text-2xl font-semibold">Dinheiro conectado ao cliente e ao job</h2>
                <p className="mt-3 text-sm leading-relaxed text-frame-gray-light">
                  Quando a proposta fecha, ela não pode sumir numa planilha. Aqui você enxerga o que entrou, o que falta receber, o que custa manter a operação e a margem de cada movimento.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["Cliente", "Proposta", "Receita", "Custo", "Margem"].map((step, index) => (
                    <span key={step} className="inline-flex min-h-9 items-center gap-2 border border-frame-gray-3 px-3 font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-gray-light">
                      <span className="text-frame-orange">{index + 1}</span>
                      {step}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {erpLanes.map((lane) => (
                  <div key={lane.label} className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
                    <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-gray-light">{lane.label}</p>
                    <strong className="mt-2 block text-xl text-frame-white">{lane.value}</strong>
                    <span className="mt-1 block text-xs text-frame-gray-light">{lane.detail}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <MetricCard label={t("app.analytics.receivedMonth")} value={formatCurrency(summary.receivedMonth)} icon={ArrowUpRight} tone="positive" />
              <MetricCard label={t("app.analytics.expensesMonth")} value={formatCurrency(summary.expensesMonth)} icon={ArrowDownRight} tone="negative" />
              <MetricCard label={t("app.analytics.profitMonth")} value={formatCurrency(summary.profitMonth)} icon={CircleDollarSign} tone={summary.profitMonth >= 0 ? "positive" : "negative"} />
              <MetricCard label={t("app.analytics.toReceive")} value={formatCurrency(summary.toReceive)} icon={CalendarClock} tone="warning" />
              <MetricCard label={t("app.analytics.recurringRevenue")} value={formatCurrency(summary.recurringRevenue)} icon={RefreshCw} tone="accent" />
              <MetricCard label={t("app.analytics.registeredClients")} value={String(overall?.clients.total ?? 0)} icon={Users} tone="accent" />
              <MetricCard label={t("app.analytics.crmWallet")} value={formatCurrency(overall?.clients.totalValue ?? 0)} icon={WalletCards} tone="positive" />
              <MetricCard label={t("app.analytics.lossesMonth")} value={formatCurrency(summary.lossesMonth)} icon={TrendingDown} tone="negative" />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="app-panel p-5 sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="frame-label">// {t("app.analytics.cashflow")}</p>
                    <h2 className="mt-1 text-xl font-semibold">{t("app.analytics.cashflowByMonth")}</h2>
                  </div>
                  <span className="font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-gray-light">
                    {t("app.analytics.lastSixMonths")}
                  </span>
                </div>

                {finance.monthlyCashflow.length ? (
                  <div className="grid min-h-64 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {finance.monthlyCashflow.map((item) => (
                      <div key={item.month} className="flex min-h-52 flex-col justify-end border border-frame-gray-3 p-4">
                        <div className="flex h-32 items-end gap-2">
                          <div
                            className="flex-1 bg-green-500/75"
                            style={{ height: `${Math.max(4, (item.income / maxCashflow) * 100)}%` }}
                            title={`${t("app.analytics.inflows")}: ${formatCurrency(item.income)}`}
                          />
                          <div
                            className="flex-1 bg-red-500/65"
                            style={{ height: `${Math.max(4, (item.expenses / maxCashflow) * 100)}%` }}
                            title={`${t("app.analytics.outflows")}: ${formatCurrency(item.expenses)}`}
                          />
                        </div>
                        <div className="mt-3 border-t border-frame-gray-3 pt-3">
                          <p className="font-frame-mono text-[0.62rem] uppercase text-frame-gray-light">{monthLabel(item.month)}</p>
                          <p className="mt-1 text-sm font-semibold">{formatCurrency(item.income - item.expenses)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <FinanceEmpty
                    title={t("app.analytics.flowStartsFirstEntry")}
                    description={t("app.analytics.flowStartHint")}
                    onClick={() => setShowEntryForm(true)}
                  />
                )}
              </div>

              <div className="app-panel flex flex-col p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="frame-label">// {t("app.analytics.openAccounts")}</p>
                    <h2 className="mt-1 text-xl font-semibold">{t("app.analytics.upcomingMovements")}</h2>
                  </div>
                  <span className="font-frame-mono text-[0.58rem] text-frame-orange">
                    {finance.pendingEntries.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {finance.pendingEntries.length ? finance.pendingEntries.map((item) => (
                    <div key={item.id} className="border border-frame-gray-3 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{item.description}</p>
                          <p className="mt-1 text-xs text-frame-gray-light">
                            {item.client_name || item.category} · {formatDate(item.due_date, t("app.analytics.noDueDate"))}
                          </p>
                        </div>
                        <p className={item.kind === "income" ? "text-green-500" : "text-red-500"}>
                          {item.kind === "income" ? "+" : "-"} {formatCurrency(item.amount)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => settleEntry(item.id)}
                        className="mt-3 inline-flex min-h-8 items-center gap-1.5 border border-frame-gray-3 px-2.5 font-frame-mono text-[0.56rem] uppercase tracking-[0.1em] text-frame-gray-light transition hover:border-frame-orange hover:text-frame-orange"
                      >
                        <Check className="h-3 w-3" />
                        {item.kind === "income" ? t("app.analytics.confirmReceipt") : t("app.analytics.confirmPayment")}
                      </button>
                    </div>
                  )) : (
                    <p className="border border-dashed border-frame-gray-3 p-5 text-sm text-frame-gray-light">
                      {t("app.analytics.noPendingAccounts")}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InsightCard
                icon={WalletCards}
                label={t("app.analytics.monthlyPredictability")}
                value={formatCurrency(summary.recurringRevenue)}
                detail={`${summary.recurringClients} ${t("app.analytics.recurringClientsDetail")} · ${formatCurrency(summary.fixedMonthly)} ${t("app.analytics.fixedCostsDetail")}`}
              />
              <InsightCard
                icon={TrendingUp}
                label={t("app.analytics.commercialPipeline")}
                value={formatCurrency(summary.openPipeline)}
                detail={`${formatCurrency(summary.weightedPipeline)} ${t("app.analytics.weightedByProbability")}`}
                onClick={() => setLocation("/pipeline")}
              />
              <InsightCard
                icon={Users}
                label={t("app.analytics.clientsNegotiation")}
                value={formatCurrency(summary.crmOpenValue)}
                detail={`${formatCurrency(summary.crmWeightedValue)} ${t("app.analytics.weightedByCrmStages")}`}
                onClick={() => setLocation("/clients")}
              />
              <InsightCard
                icon={Receipt}
                label={t("app.analytics.cashRisk")}
                value={formatCurrency(summary.overdueReceivables)}
                detail={`${formatCurrency(summary.toPay)} ${t("app.analytics.stillToPay")}`}
              />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="app-panel p-5 sm:p-6">
                <p className="frame-label">// {t("app.analytics.revenueClients")}</p>
                <div className="mt-5 space-y-3">
                  {finance.topClients.length ? finance.topClients.map((client, index) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setLocation(`/clients/${client.id}/editar`)}
                      className="flex w-full items-center gap-3 border-b border-frame-gray-3 pb-3 text-left last:border-0 last:pb-0"
                    >
                      <span className="grid h-8 w-8 place-items-center bg-frame-orange/10 font-frame-mono text-[0.58rem] text-frame-orange">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{client.name}</span>
                        <span className="block truncate text-xs text-frame-gray-light">{client.company || t("app.analytics.directClient")}</span>
                      </span>
                      <strong className="text-sm">{formatCurrency(client.revenue)}</strong>
                    </button>
                  )) : (
                    <p className="text-sm text-frame-gray-light">{t("app.analytics.linkEntriesRanking")}</p>
                  )}
                </div>
              </div>

              <div className="app-panel p-5 sm:p-6">
                <p className="frame-label">// {t("app.analytics.revenueSourcesTitle")}</p>
                <div className="mt-5 space-y-4">
                  {finance.revenueSources.length ? finance.revenueSources.map((source) => {
                    const max = Math.max(...finance.revenueSources.map((item) => item.amount), 1);
                    return (
                      <div key={source.category}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="capitalize text-frame-gray-light">{source.category}</span>
                          <strong>{formatCurrency(source.amount)}</strong>
                        </div>
                        <div className="h-2 bg-frame-gray-3">
                          <div className="h-full bg-frame-orange" style={{ width: `${(source.amount / max) * 100}%` }} />
                        </div>
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-frame-gray-light">{t("app.analytics.categoriesAfterReceipts")}</p>
                  )}
                </div>
              </div>
            </section>

            <section className="app-panel overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-frame-gray-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="frame-label">// {t("app.analytics.cashbook")}</p>
                  <h2 className="mt-1 text-xl font-semibold">{t("app.analytics.recentEntries")}</h2>
                </div>
                <p className="text-xs text-frame-gray-light">{t("app.analytics.recentEntriesDescription")}</p>
              </div>

              <div className="divide-y divide-frame-gray-3">
                {finance.recentEntries.length ? finance.recentEntries.map((item) => (
                  <div key={item.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 sm:grid-cols-[auto_1.4fr_0.8fr_0.8fr_auto] sm:px-5">
                    <span className={`grid h-8 w-8 place-items-center ${item.kind === "income" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                      {item.kind === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{item.description}</p>
                      <p className="truncate text-xs text-frame-gray-light">{item.client_name || item.category}</p>
                    </div>
                    <p className="hidden text-xs text-frame-gray-light sm:block">{formatDate(item.due_date || item.paid_at, t("app.analytics.noDueDate"))}</p>
                    <div className="hidden sm:block">
                      <span className={`font-frame-mono text-[0.54rem] uppercase tracking-[0.1em] ${
                        item.status === "settled" ? "text-green-500" : "text-frame-orange"
                      }`}>
                        {item.status === "settled" ? t("app.analytics.settled") : t("app.common.pending")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <strong className={item.kind === "income" ? "text-green-500" : "text-red-500"}>
                        {item.kind === "income" ? "+" : "-"} {formatCurrency(item.amount)}
                      </strong>
                      <button
                        type="button"
                        onClick={() => deleteEntry(item.id)}
                        className="grid h-8 w-8 place-items-center text-frame-gray-light transition hover:text-frame-red"
                        aria-label={`${t("app.common.delete")} ${item.description}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <FinanceEmpty
                    title={t("app.analytics.noEntries")}
                    description={t("app.analytics.noEntriesHint")}
                    onClick={() => setShowEntryForm(true)}
                  />
                )}
              </div>
            </section>

            {overall && (
              <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <OperationalMetric label={t("app.analytics.clients")} value={overall.clients.total} icon={Users} />
                <OperationalMetric label={t("app.analytics.activeProjects")} value={overall.projects.active} icon={Banknote} />
                <OperationalMetric label={t("app.analytics.opportunities")} value={overall.pipeline.totalOpportunities} icon={TrendingUp} />
                <OperationalMetric label={t("app.analytics.crmHistoricalValue")} value={formatCurrency(overall.clients.totalValue)} icon={CircleDollarSign} />
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof CircleDollarSign;
  tone: "positive" | "negative" | "warning" | "accent";
}) {
  const toneClass = {
    positive: "text-green-500 bg-green-500/10",
    negative: "text-red-500 bg-red-500/10",
    warning: "text-amber-500 bg-amber-500/10",
    accent: "text-frame-orange bg-frame-orange/10",
  }[tone];

  return (
    <div className="app-panel min-w-0 p-4">
      <div className={`mb-4 grid h-9 w-9 place-items-center ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-frame-mono text-[0.56rem] uppercase tracking-[0.11em] text-frame-gray-light">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold sm:text-xl" title={value}>{value}</p>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  label,
  value,
  detail,
  onClick,
}: {
  icon: typeof WalletCards;
  label: string;
  value: string;
  detail: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-9 w-9 place-items-center bg-frame-orange/10 text-frame-orange">
          <Icon className="h-4 w-4" />
        </span>
        {onClick && <ArrowRight className="h-4 w-4 text-frame-gray-light" />}
      </div>
      <p className="mt-5 font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-gray-light">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-frame-gray-light">{detail}</p>
    </>
  );

  return onClick ? (
    <button type="button" onClick={onClick} className="app-panel p-5 text-left transition hover:border-frame-orange/50">
      {content}
    </button>
  ) : (
    <div className="app-panel p-5">{content}</div>
  );
}

function OperationalMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof Users;
}) {
  return (
    <div className="app-panel flex items-center gap-3 p-4">
      <Icon className="h-4 w-4 shrink-0 text-frame-orange" />
      <div className="min-w-0">
        <p className="truncate font-frame-mono text-[0.54rem] uppercase tracking-[0.1em] text-frame-gray-light">{label}</p>
        <p className="mt-0.5 truncate font-semibold">{value}</p>
      </div>
    </div>
  );
}

function FinanceEmpty({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center p-6 text-center">
      <CircleDollarSign className="mb-3 h-7 w-7 text-frame-orange" />
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-relaxed text-frame-gray-light">{description}</p>
      <button type="button" onClick={onClick} className="frame-btn-ghost mt-4 inline-flex items-center gap-2">
        <Plus className="h-3.5 w-3.5" />
        Criar lançamento
      </button>
    </div>
  );
}

export default function Analytics() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
