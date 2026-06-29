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

const formatDate = (value: string | null) => {
  if (!value) return "Sem vencimento";
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
      toast.error("Erro ao carregar a central financeira");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

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
      toast.error("Informe descrição e valor");
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
      if (!result.success) throw new Error(result.error || "Erro ao salvar lançamento");
      setEntry(initialEntry);
      setShowEntryForm(false);
      toast.success("Lançamento registrado");
      await loadAnalytics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao salvar lançamento");
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
      if (!result.success) throw new Error(result.error || "Erro ao atualizar lançamento");
      toast.success("Pagamento confirmado");
      await loadAnalytics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao atualizar lançamento");
    }
  };

  const deleteEntry = async (id: number) => {
    if (!window.confirm("Excluir este lançamento financeiro?")) return;
    try {
      const response = await fetch(`/api/analytics/finance/entries/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Erro ao excluir lançamento");
      toast.success("Lançamento excluído");
      await loadAnalytics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao excluir lançamento");
    }
  };

  const exportPipeline = () => {
    window.open("/api/export-pipeline?format=csv", "_blank");
  };

  const summary = finance?.summary;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body">
      <AppNavBar />

      <main id="main-content" className="mx-auto w-full max-w-[1500px] space-y-6 px-4 py-6 sm:px-6 sm:py-9">
        <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="frame-label mb-2">// CAIXA E PERFORMANCE</p>
            <h1 className="frame-title text-[clamp(2.3rem,4.4vw,4.2rem)]">FINANCEIRO & ANALYTICS</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-frame-gray-light">
              Saiba o que entrou, o que saiu, o que está por receber e quais clientes sustentam a operação.
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
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => setShowEntryForm((value) => !value)}
              className="frame-btn-primary inline-flex items-center gap-2"
            >
              {showEntryForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showEntryForm ? "Fechar" : "Novo lançamento"}
            </button>
          </div>
        </header>

        {showEntryForm && (
          <form onSubmit={submitEntry} className="app-panel p-4 sm:p-5">
            <div className="mb-4 flex flex-col gap-1">
              <p className="frame-label">// REGISTRAR MOVIMENTO</p>
              <p className="text-sm text-frame-gray-light">Use para recebimentos, custos, assinaturas e despesas fixas.</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="grid grid-cols-2 border border-frame-gray-3">
                {(["income", "expense"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setEntry((current) => ({ ...current, kind }))}
                    className={`min-h-11 px-3 text-xs font-medium transition ${
                      entry.kind === kind
                        ? kind === "income"
                          ? "bg-green-500/12 text-green-500"
                          : "bg-red-500/12 text-red-500"
                        : "text-frame-gray-light"
                    }`}
                  >
                    {kind === "income" ? "Entrada" : "Saída"}
                  </button>
                ))}
              </div>
              <input
                className="frame-input"
                value={entry.description}
                onChange={(event) => setEntry((current) => ({ ...current, description: event.target.value }))}
                placeholder="Descrição do lançamento"
              />
              <input
                className="frame-input"
                type="number"
                min="1"
                step="0.01"
                value={entry.amount}
                onChange={(event) => setEntry((current) => ({ ...current, amount: event.target.value }))}
                placeholder="Valor em R$"
              />
              <select
                className="frame-input"
                value={entry.category}
                onChange={(event) => setEntry((current) => ({ ...current, category: event.target.value }))}
              >
                <option value="projeto">Projeto</option>
                <option value="mensalidade">Mensalidade</option>
                <option value="equipe">Equipe</option>
                <option value="equipamento">Equipamento</option>
                <option value="software">Software</option>
                <option value="impostos">Impostos</option>
                <option value="estrutura">Estrutura</option>
                <option value="outros">Outros</option>
              </select>
              <select
                className="frame-input"
                value={entry.clientId}
                onChange={(event) => setEntry((current) => ({ ...current, clientId: event.target.value }))}
              >
                <option value="">Sem cliente vinculado</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}{client.company ? ` · ${client.company}` : ""}
                  </option>
                ))}
              </select>
              <input
                className="frame-input"
                type="date"
                value={entry.dueDate}
                onChange={(event) => setEntry((current) => ({ ...current, dueDate: event.target.value }))}
              />
              <select
                className="frame-input"
                value={entry.status}
                onChange={(event) => setEntry((current) => ({ ...current, status: event.target.value as EntryForm["status"] }))}
              >
                <option value="pending">Pendente</option>
                <option value="settled">{entry.kind === "income" ? "Recebido" : "Pago"}</option>
              </select>
              <select
                className="frame-input"
                value={entry.recurrence}
                onChange={(event) => setEntry((current) => ({ ...current, recurrence: event.target.value as EntryForm["recurrence"] }))}
              >
                <option value="once">Uma vez</option>
                <option value="monthly">Mensal</option>
              </select>
            </div>
            <div className="mt-4 flex flex-col gap-3 border-t border-frame-gray-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="inline-flex items-center gap-2 text-sm text-frame-gray-light">
                <input
                  type="checkbox"
                  checked={entry.isFixed}
                  onChange={(event) => setEntry((current) => ({ ...current, isFixed: event.target.checked }))}
                />
                Valor fixo da operação
              </label>
              <button type="submit" disabled={isSaving} className="frame-btn-primary">
                {isSaving ? "Salvando..." : "Salvar lançamento"}
              </button>
            </div>
          </form>
        )}

        {isLoading || !summary ? (
          <div className="flex min-h-64 items-center justify-center">
            <RefreshCw className="h-7 w-7 animate-spin text-frame-orange" />
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              <MetricCard label="Recebido no mês" value={formatCurrency(summary.receivedMonth)} icon={ArrowUpRight} tone="positive" />
              <MetricCard label="Custos no mês" value={formatCurrency(summary.expensesMonth)} icon={ArrowDownRight} tone="negative" />
              <MetricCard label="Lucro do mês" value={formatCurrency(summary.profitMonth)} icon={CircleDollarSign} tone={summary.profitMonth >= 0 ? "positive" : "negative"} />
              <MetricCard label="A receber" value={formatCurrency(summary.toReceive)} icon={CalendarClock} tone="warning" />
              <MetricCard label="Receita recorrente" value={formatCurrency(summary.recurringRevenue)} icon={RefreshCw} tone="accent" />
              <MetricCard label="Clientes cadastrados" value={String(overall?.clients.total ?? 0)} icon={Users} tone="accent" />
              <MetricCard label="Carteira CRM" value={formatCurrency(overall?.clients.totalValue ?? 0)} icon={WalletCards} tone="positive" />
              <MetricCard label="Perdas no mês" value={formatCurrency(summary.lossesMonth)} icon={TrendingDown} tone="negative" />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_0.65fr]">
              <div className="app-panel p-5 sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <p className="frame-label">// FLUXO DE CAIXA</p>
                    <h2 className="mt-1 text-xl font-semibold">Entradas e saídas por mês</h2>
                  </div>
                  <span className="font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-gray-light">
                    Últimos 6 meses
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
                            title={`Entradas: ${formatCurrency(item.income)}`}
                          />
                          <div
                            className="flex-1 bg-red-500/65"
                            style={{ height: `${Math.max(4, (item.expenses / maxCashflow) * 100)}%` }}
                            title={`Saídas: ${formatCurrency(item.expenses)}`}
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
                    title="Seu fluxo começa no primeiro lançamento"
                    description="Registre uma entrada recebida ou uma despesa paga para formar o histórico mensal."
                    onClick={() => setShowEntryForm(true)}
                  />
                )}
              </div>

              <div className="app-panel flex flex-col p-5 sm:p-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="frame-label">// CONTAS EM ABERTO</p>
                    <h2 className="mt-1 text-xl font-semibold">Próximos movimentos</h2>
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
                            {item.client_name || item.category} · {formatDate(item.due_date)}
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
                        {item.kind === "income" ? "Confirmar recebimento" : "Confirmar pagamento"}
                      </button>
                    </div>
                  )) : (
                    <p className="border border-dashed border-frame-gray-3 p-5 text-sm text-frame-gray-light">
                      Nenhuma conta pendente.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InsightCard
                icon={WalletCards}
                label="Previsibilidade mensal"
                value={formatCurrency(summary.recurringRevenue)}
                detail={`${summary.recurringClients} cliente(s) recorrente(s) · ${formatCurrency(summary.fixedMonthly)} em custos fixos`}
              />
              <InsightCard
                icon={TrendingUp}
                label="Pipeline comercial"
                value={formatCurrency(summary.openPipeline)}
                detail={`${formatCurrency(summary.weightedPipeline)} ponderado pela probabilidade`}
                onClick={() => setLocation("/pipeline")}
              />
              <InsightCard
                icon={Users}
                label="Clientes em negociação"
                value={formatCurrency(summary.crmOpenValue)}
                detail={`${formatCurrency(summary.crmWeightedValue)} ponderado pelas etapas do CRM`}
                onClick={() => setLocation("/clients")}
              />
              <InsightCard
                icon={Receipt}
                label="Risco de caixa"
                value={formatCurrency(summary.overdueReceivables)}
                detail={`${formatCurrency(summary.toPay)} ainda a pagar`}
              />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div className="app-panel p-5 sm:p-6">
                <p className="frame-label">// CLIENTES QUE GERAM RECEITA</p>
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
                        <span className="block truncate text-xs text-frame-gray-light">{client.company || "Cliente direto"}</span>
                      </span>
                      <strong className="text-sm">{formatCurrency(client.revenue)}</strong>
                    </button>
                  )) : (
                    <p className="text-sm text-frame-gray-light">Vincule entradas a clientes para criar este ranking.</p>
                  )}
                </div>
              </div>

              <div className="app-panel p-5 sm:p-6">
                <p className="frame-label">// DE ONDE VEM O DINHEIRO</p>
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
                    <p className="text-sm text-frame-gray-light">As categorias aparecem após os primeiros recebimentos.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="app-panel overflow-hidden">
              <div className="flex flex-col gap-2 border-b border-frame-gray-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="frame-label">// LIVRO-CAIXA</p>
                  <h2 className="mt-1 text-xl font-semibold">Lançamentos recentes</h2>
                </div>
                <p className="text-xs text-frame-gray-light">Entradas, saídas, recorrências e pendências em um histórico único.</p>
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
                    <p className="hidden text-xs text-frame-gray-light sm:block">{formatDate(item.due_date || item.paid_at)}</p>
                    <div className="hidden sm:block">
                      <span className={`font-frame-mono text-[0.54rem] uppercase tracking-[0.1em] ${
                        item.status === "settled" ? "text-green-500" : "text-frame-orange"
                      }`}>
                        {item.status === "settled" ? "Liquidado" : "Pendente"}
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
                        aria-label={`Excluir ${item.description}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <FinanceEmpty
                    title="Nenhum lançamento registrado"
                    description="A central financeira passa a trabalhar assim que você registrar entradas e saídas."
                    onClick={() => setShowEntryForm(true)}
                  />
                )}
              </div>
            </section>

            {overall && (
              <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <OperationalMetric label="Clientes" value={overall.clients.total} icon={Users} />
                <OperationalMetric label="Projetos ativos" value={overall.projects.active} icon={Banknote} />
                <OperationalMetric label="Oportunidades" value={overall.pipeline.totalOpportunities} icon={TrendingUp} />
                <OperationalMetric label="Valor histórico CRM" value={formatCurrency(overall.clients.totalValue)} icon={CircleDollarSign} />
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
