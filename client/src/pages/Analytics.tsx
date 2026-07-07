import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useClientIdFromQuery } from "@/hooks/useClientIdFromQuery";
import {
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  Check,
  Download,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { api, type Project } from "@/lib/api";

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
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(Number(value) || 0);

const formatDate = (value: string | null, localeStr = "pt-BR") => {
  if (!value) return localeStr === "en-US" ? "No date" : "Sem data";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(localeStr);
};

const monthLabel = (value: string, localeStr = "pt-BR") => {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Intl.DateTimeFormat(localeStr, { month: "short", year: "2-digit" }).format(new Date(year, month - 1, 1)).replace(".", "");
};


function ClientLink({ clientId, clientName }: { clientId: number | null; clientName?: string | null }) {
  const [, setLocation] = useLocation();
  if (!clientId || !clientName) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); setLocation(`/clients/${clientId}`); }}
      className="flex items-center gap-1 text-xs text-frame-orange hover:underline"
    >
      <Building2 className="w-3 h-3" />
      {clientName}
    </button>
  );
}

function AnalyticsContent() {
  const { t, locale } = useLanguage();
  const [, setLocation] = useLocation();
  const [overall, setOverall] = useState<OverallAnalytics | null>(null);
  const [finance, setFinance] = useState<FinanceOverview | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [entry, setEntry] = useState<EntryForm>(initialEntry);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [sortField, setSortField] = useState<"date" | "amount" | "status">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [contextProject, setContextProject] = useState<Project | null>(null);
  const projectIdParam = Number(new URLSearchParams(window.location.search).get("projectId") || 0);
  const clientIdParam = useClientIdFromQuery();
  const newEntryParam = new URLSearchParams(window.location.search).get("newEntry");

  const loadAnalytics = useCallback(async () => {
    try {
      setRefreshing(true);
      const [overallRes, financeRes, clientsRes] = await Promise.all([
        fetch("/api/analytics-overall", { credentials: "include" }),
        fetch("/api/analytics/finance", { credentials: "include" }),
        fetch("/api/clients", { credentials: "include" }),
      ]);
      const [overallData, financeData, clientsData] = await Promise.all([
        overallRes.json(), financeRes.json(), clientsRes.json(),
      ]);
      if (overallData.success) setOverall(overallData.data);
      if (financeData.success) setFinance(financeData.data);
      if (clientsData.success) setClients(Array.isArray(clientsData.data) ? clientsData.data : []);
    } catch (error) {
      console.error(error);
      toast.error(t("app.finance.toastLoadError"));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  useEffect(() => {
    if (!projectIdParam) return;
    api.projects.get(projectIdParam).then(setContextProject).catch(() => setContextProject(null));
  }, [projectIdParam]);

  useEffect(() => {
    if (clientIdParam === null) return;
    setEntry((c) => ({ ...c, clientId: String(clientIdParam) }));
    if (newEntryParam === "1") {
      setShowEntryForm(true);
    }
  }, [clientIdParam, newEntryParam]);

  const openProjectEntry = () => {
    if (contextProject) {
      let metadata: { commercialValue?: number } = {};
      try { metadata = JSON.parse(contextProject.metadataJson || "{}"); } catch { metadata = {}; }
      setEntry((c) => ({
        ...c,
        description: `Resultado do projeto: ${contextProject.name}`,
        amount: metadata.commercialValue ? String(metadata.commercialValue) : c.amount,
        clientId: contextProject.clientId ? String(contextProject.clientId) : c.clientId,
      }));
    }
    setShowEntryForm(true);
  };

  useEffect(() => {
    if (!showEntryForm) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setShowEntryForm(false); setEditingEntry(null); } };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", handleKey); };
  }, [showEntryForm]);

  const maxCashflow = useMemo(() => {
    if (!finance?.monthlyCashflow.length) return 1;
    return Math.max(1, ...finance.monthlyCashflow.flatMap((i) => [i.income, i.expenses]));
  }, [finance]);

  const sortedEntries = useMemo(() => {
    if (!finance?.recentEntries) return [];
    return [...finance.recentEntries].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "amount") return (a.amount - b.amount) * dir;
      if (sortField === "status") return a.status.localeCompare(b.status) * dir;
      // date (default)
      const dateA = new Date(a.due_date || a.created_at).getTime();
      const dateB = new Date(b.due_date || b.created_at).getTime();
      return (dateA - dateB) * dir;
    });
  }, [finance?.recentEntries, sortField, sortDir]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const startEditEntry = (item: FinancialEntry) => {
    setEntry({
      kind: item.kind,
      description: item.description,
      category: item.category,
      amount: String(item.amount),
      status: item.status === "settled" ? "settled" : "pending",
      dueDate: item.due_date?.slice(0, 10) || "",
      recurrence: item.recurrence,
      clientId: item.client_id ? String(item.client_id) : "",
      isFixed: Boolean(item.is_fixed),
    });
    setEditingEntry(item);
    setShowEntryForm(true);
  };

  const submitEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!entry.description.trim() || !Number(entry.amount)) {
      toast.error(t("app.finance.toastFillRequired"));
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...entry, amount: Number(entry.amount),
        clientId: entry.clientId ? Number(entry.clientId) : null,
        paidAt: entry.status === "settled" ? new Date().toISOString().slice(0, 10) : null,
      };

      if (editingEntry) {
        const res = await fetch(`/api/analytics/finance/entries/${editingEntry.id}`, {
          method: "PATCH", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || t("app.finance.toastSaveError"));
        setEditingEntry(null);
        setEntry(initialEntry);
        setShowEntryForm(false);
        toast.success(t("app.finance.toastUpdated"));
      } else {
        const res = await fetch("/api/analytics/finance/entries", {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (!result.success) throw new Error(result.error || t("app.finance.toastSaveError"));
        setEntry(initialEntry);
        setShowEntryForm(false);
        toast.success(t("app.finance.toastRegistered"));
      }
      await loadAnalytics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.finance.toastSaveError"));
    } finally { setIsSaving(false); }
  };

  const settleEntry = async (id: number) => {
    try {
      const res = await fetch(`/api/analytics/finance/entries/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "settled" }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || t("app.finance.toastError"));
      toast.success(t("app.finance.toastPaymentConfirmed"));
      await loadAnalytics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.finance.toastError"));
    }
  };

  const deleteEntry = async (id: number) => {
    if (!window.confirm(t("app.finance.toastDeleteConfirm"))) return;
    try {
      const res = await fetch(`/api/analytics/finance/entries/${id}`, { method: "DELETE", credentials: "include" });
      const result = await res.json();
      if (!result.success) throw new Error(result.error || t("app.finance.toastError"));
      toast.success(t("app.finance.toastDeleted"));
      await loadAnalytics();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.finance.toastError"));
    }
  };

  const summary = finance?.summary;

  if (isLoading || !summary) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white">
        <AppNavBar />
        <div className="flex items-center justify-center py-32">
          <RefreshCw className="h-7 w-7 animate-spin text-frame-orange" />
        </div>
      </div>
    );
  }

  const profit = summary.receivedMonth - summary.expensesMonth;
  const margin = summary.receivedMonth > 0 ? Math.round((profit / summary.receivedMonth) * 100) : 0;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white">
      <AppNavBar />

      <main id="main-content" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-9">

        {/* ═══ HEADER ═══ */}
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-frame-gray-3 pb-6">
          <div>
            <p className="frame-label mb-2">{t("app.finance.eyebrow")}</p>
            <h1 className="frame-title text-[clamp(1.8rem,3.5vw,2.8rem)]">
              {t("app.finance.title")}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-frame-gray-light">
              {t("app.finance.subtitle")}
            </p>
            {/* Workflow steps */}
            <div className="flex gap-2 mt-4">
              <div className="border border-frame-orange/30 bg-frame-orange/[0.06] px-3 py-2 text-center min-w-[90px]">
                <span className="block font-frame-mono text-[0.5rem] text-frame-orange">01</span>
                <span className="block text-[0.6rem] font-medium text-frame-white mt-0.5">{t("app.finance.step1")}</span>
              </div>
              <div className="border border-frame-gray-3/40 px-3 py-2 text-center min-w-[90px]">
                <span className="block font-frame-mono text-[0.5rem] text-frame-gray-light">02</span>
                <span className="block text-[0.6rem] font-medium text-frame-gray-light mt-0.5">{t("app.finance.step2")}</span>
              </div>
              <div className="border border-frame-gray-3/40 px-3 py-2 text-center min-w-[90px]">
                <span className="block font-frame-mono text-[0.5rem] text-frame-gray-light">03</span>
                <span className="block text-[0.6rem] font-medium text-frame-gray-light mt-0.5">{t("app.finance.step3")}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => window.open("/api/export-pipeline?format=csv", "_blank")} className="frame-btn-ghost inline-flex items-center gap-2">
              <Download className="h-4 w-4" /> {t("app.finance.export")}
            </button>
            <button type="button" onClick={loadAnalytics} disabled={refreshing} className="frame-btn-ghost inline-flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> {t("app.finance.refresh")}
            </button>
            <button type="button" onClick={openProjectEntry} className="frame-btn-primary inline-flex items-center gap-2">
              <Plus className="h-4 w-4" /> {t("app.finance.newEntry")}
            </button>
          </div>
        </header>

        {/* ═══ CONTEXT: Job being closed ═══ */}
        {contextProject && (
          <section className="border border-frame-orange/40 bg-frame-orange/[0.05] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-orange">{t("app.finance.jobClose")}</p>
              <h2 className="mt-1 text-base font-semibold">{contextProject.name}</h2>
              <p className="text-xs text-frame-gray-light mt-1">{t("app.finance.jobCloseDesc")}</p>
            </div>
            <button type="button" onClick={() => setLocation(`/project/${contextProject.id}`)} className="frame-btn-ghost shrink-0 text-xs">
              {t("app.finance.backToJob")}
            </button>
          </section>
        )}

        {/* ═══ RESULTADO DO MÊS (4 cards principais) ═══ */}
        <section>
          <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.14em] text-frame-gray-light mb-3">
            {t("app.finance.monthResult")}
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowUpRight className="w-4 h-4 text-green-400" />
                <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light">{t("app.finance.received")}</span>
              </div>
              <strong className="text-xl text-frame-white">{formatCurrency(summary.receivedMonth)}</strong>
            </div>
            <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowDownRight className="w-4 h-4 text-red-400" />
                <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light">{t("app.finance.expenses")}</span>
              </div>
              <strong className="text-xl text-frame-white">{formatCurrency(summary.expensesMonth)}</strong>
            </div>
            <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${profit >= 0 ? "bg-green-400" : "bg-red-400"}`} />
                <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light">{t("app.finance.profit")}</span>
              </div>
              <strong className={`text-xl ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(profit)}</strong>
              <span className="block text-[0.6rem] text-frame-gray-light mt-1">{t("app.finance.margin")} {margin}%</span>
            </div>
            <div className="border border-frame-orange/30 bg-frame-orange/[0.05] p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-frame-orange" />
                <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light">{t("app.finance.toReceive")}</span>
              </div>
              <strong className="text-xl text-frame-orange">{formatCurrency(summary.toReceive)}</strong>
              {summary.overdueReceivables > 0 && (
                <span className="block text-[0.6rem] text-red-400 mt-1">{formatCurrency(summary.overdueReceivables)} {t("app.finance.overdue")}</span>
              )}
            </div>
          </div>
        </section>

        {/* ═══ VISÃO OPERACIONAL (a receber / a pagar / recorrente / previsão) ═══ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: t("app.finance.accountsReceivable"), value: formatCurrency(summary.toReceive), detail: `${formatCurrency(summary.overdueReceivables)} ${t("app.finance.overdue")}` },
            { label: t("app.finance.accountsPayable"), value: formatCurrency(summary.toPay), detail: `${formatCurrency(summary.fixedMonthly)} ${t("app.finance.fixedMonthly")}` },
            { label: t("app.finance.recurringRevenue"), value: formatCurrency(summary.recurringRevenue), detail: `${summary.recurringClients} ${t("app.finance.clientCount")}` },
            { label: t("app.finance.forecast"), value: formatCurrency(summary.weightedPipeline), detail: `${formatCurrency(summary.openPipeline)} ${t("app.finance.inNegotiation")}` },
          ].map((item) => (
            <div key={item.label} className="border border-frame-gray-3/60 p-4">
              <span className="font-frame-mono text-[0.55rem] uppercase tracking-[0.12em] text-frame-gray-light">{item.label}</span>
              <strong className="block text-lg text-frame-white mt-1.5">{item.value}</strong>
              <span className="block text-[0.6rem] text-frame-gray-light mt-1">{item.detail}</span>
            </div>
          ))}
        </section>

        {/* ═══ CONDITIONAL: Empty Onboarding vs Data View ═══ */}
        {!finance.recentEntries.length && !finance.monthlyCashflow.some(m => m.income > 0 || m.expenses > 0) ? (
          /* ═══ UNIFIED EMPTY STATE ═══ */
          <section className="border border-frame-orange/20 bg-gradient-to-b from-frame-orange/[0.04] to-transparent p-8 sm:p-12 text-center space-y-8">
            <div>
              <div className="w-16 h-16 mx-auto flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-full mb-5">
                <ArrowUpRight className="w-8 h-8 text-frame-orange" />
              </div>
              <h2 className="text-2xl font-bold text-frame-white">{t("app.finance.onboardTitle")}</h2>
              <p className="text-sm text-frame-gray-light mt-2 max-w-md mx-auto leading-relaxed">{t("app.finance.onboardDesc")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl mx-auto">
              <div className="border border-frame-orange/25 bg-frame-orange/[0.06] p-4 relative">
                <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-frame-orange text-frame-black text-[0.55rem] font-bold uppercase tracking-wider">01</div>
                <p className="text-sm font-semibold text-frame-white mt-2">{t("app.finance.onboardStep1")}</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1">{t("app.finance.onboardStep1Desc")}</p>
              </div>
              <div className="border border-frame-gray-3/50 p-4 relative">
                <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-frame-gray-3 text-frame-gray-light text-[0.55rem] font-bold uppercase tracking-wider">02</div>
                <p className="text-sm font-semibold text-frame-white mt-2">{t("app.finance.onboardStep2")}</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1">{t("app.finance.onboardStep2Desc")}</p>
              </div>
              <div className="border border-frame-gray-3/50 p-4 relative">
                <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-frame-gray-3 text-frame-gray-light text-[0.55rem] font-bold uppercase tracking-wider">03</div>
                <p className="text-sm font-semibold text-frame-white mt-2">{t("app.finance.onboardStep3")}</p>
                <p className="text-[0.65rem] text-frame-gray-light mt-1">{t("app.finance.onboardStep3Desc")}</p>
              </div>
            </div>
            <div className="border-t border-frame-gray-3/40 pt-6 max-w-lg mx-auto">
              <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange mb-3">{t("app.finance.onboardExamples")}</p>
              <div className="space-y-1.5 text-left">
                <p className="text-[0.7rem] text-frame-gray-light flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />{t("app.finance.onboardEx1")}</p>
                <p className="text-[0.7rem] text-frame-gray-light flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{t("app.finance.onboardEx2")}</p>
                <p className="text-[0.7rem] text-frame-gray-light flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />{t("app.finance.onboardEx3")}</p>
              </div>
            </div>
            <button type="button" onClick={() => setShowEntryForm(true)} className="frame-btn-primary inline-flex items-center gap-2 !py-3 !px-6">
              <Plus className="w-4 h-4" /> {t("app.finance.onboardCta")}
            </button>
          </section>
        ) : (
          <>
        {/* ═══ TWO COLUMNS: Cashflow + Pendentes ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.6fr] gap-5">

          {/* Cashflow */}
          <section className="border border-frame-gray-3 p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.12em] text-frame-gray-light">{t("app.finance.cashflow")}</p>
                <h3 className="text-base font-semibold mt-1">{t("app.finance.cashflowSub")}</h3>
              </div>
              <div className="flex items-center gap-4 text-[0.6rem] font-frame-mono">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500/80" /> {t("app.finance.toggleIncome")}</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/60" /> {t("app.finance.toggleExpense")}</span>
              </div>
            </div>
            {finance.monthlyCashflow.length ? (
              <div className="space-y-1">
                {/* Chart area */}
                <div className="flex items-end gap-1.5 h-36 px-1">
                  {finance.monthlyCashflow.map((item) => {
                    const netResult = item.income - item.expenses;
                    const incomeHeight = Math.max(4, (item.income / maxCashflow) * 100);
                    const expenseHeight = Math.max(4, (item.expenses / maxCashflow) * 100);
                    return (
                      <div key={item.month} className="flex-1 flex flex-col items-center gap-0 group relative">
                        {/* Tooltip on hover */}
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-frame-black border border-frame-gray-3 px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                          <p className="text-[0.55rem] text-green-400">+{formatCurrency(item.income)}</p>
                          <p className="text-[0.55rem] text-red-400">-{formatCurrency(item.expenses)}</p>
                          <p className={`text-[0.55rem] font-semibold ${netResult >= 0 ? "text-frame-white" : "text-red-400"}`}>= {formatCurrency(netResult)}</p>
                        </div>
                        {/* Bars */}
                        <div className="flex items-end gap-[2px] w-full h-full">
                          <div
                            className="flex-1 bg-gradient-to-t from-green-500 to-green-400/60 rounded-t-[3px] transition-all duration-300 group-hover:from-green-400 group-hover:to-green-300/70"
                            style={{ height: `${incomeHeight}%` }}
                          />
                          <div
                            className="flex-1 bg-gradient-to-t from-red-500/80 to-red-400/40 rounded-t-[3px] transition-all duration-300 group-hover:from-red-400 group-hover:to-red-300/60"
                            style={{ height: `${expenseHeight}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* X axis labels */}
                <div className="flex gap-1.5 px-1 pt-2 border-t border-frame-gray-3/30">
                  {finance.monthlyCashflow.map((item) => (
                    <div key={item.month} className="flex-1 text-center">
                      <span className="font-frame-mono text-[0.5rem] text-frame-gray-light uppercase">{monthLabel(item.month)}</span>
                    </div>
                  ))}
                </div>
                {/* Net result row */}
                <div className="flex gap-1.5 px-1">
                  {finance.monthlyCashflow.map((item) => {
                    const net = item.income - item.expenses;
                    return (
                      <div key={`net-${item.month}`} className="flex-1 text-center">
                        <span className={`font-frame-mono text-[0.5rem] font-semibold ${net >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {net >= 0 ? "+" : ""}{(net / 1000).toFixed(1)}k
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Chart placeholder skeleton */
              <div className="relative h-32 flex items-end gap-2 px-4 opacity-30">
                {[35, 55, 45, 70, 60, 80].map((h, i) => (
                  <div key={i} className="flex-1 flex items-end gap-0.5">
                    <div className="flex-1 bg-gradient-to-t from-green-500/40 to-green-500/10 rounded-t-sm" style={{ height: `${h}%` }} />
                    <div className="flex-1 bg-gradient-to-t from-red-500/30 to-red-500/10 rounded-t-sm" style={{ height: `${h * 0.6}%` }} />
                  </div>
                ))}
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs text-frame-gray-light bg-frame-black/80 px-3 py-1.5 border border-frame-gray-3">{t("app.finance.emptyFlow")}</p>
                </div>
              </div>
            )}
          </section>

          {/* Contas pendentes */}
          <section className="border border-frame-gray-3 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.12em] text-frame-gray-light">{t("app.finance.nextMovements")}</p>
              </div>
              <span className="font-frame-mono text-[0.6rem] text-frame-orange">{finance.pendingEntries.length}</span>
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {finance.pendingEntries.length ? finance.pendingEntries.map((item) => (
                <div key={item.id} className="border border-frame-gray-3/50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-frame-white">{item.description}</p>
                      <p className="text-[0.6rem] text-frame-gray-light mt-0.5">
                        {item.client_name || item.category} · {formatDate(item.due_date)}
                      </p>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${item.kind === "income" ? "text-green-400" : "text-red-400"}`}>
                      {item.kind === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => settleEntry(item.id)} className="inline-flex items-center gap-1 border border-frame-gray-3 px-2 py-1 font-frame-mono text-[0.52rem] uppercase text-frame-gray-light hover:border-green-500/50 hover:text-green-400 transition">
                      <Check className="w-2.5 h-2.5" /> {t("app.finance.confirm")}
                    </button>
                    <button type="button" onClick={() => deleteEntry(item.id)} className="inline-flex items-center gap-1 border border-frame-gray-3 px-2 py-1 font-frame-mono text-[0.52rem] uppercase text-frame-gray-light hover:border-red-500/50 hover:text-red-400 transition">
                      <Trash2 className="w-2.5 h-2.5" /> {t("app.finance.delete")}
                    </button>
                  </div>
                </div>
              )) : (
                <div className="frame-empty-state p-5 flex items-center gap-3 text-left">
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-frame-green/10 border border-frame-green/30">
                    <Check className="w-4 h-4 text-frame-green" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-frame-white">{t("app.finance.noPending")}</p>
                    <p className="text-[0.65rem] text-frame-gray-light mt-0.5">
                      {t("app.finance.noPendingDesc")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ═══ CLIENTES QUE MAIS GERAM RECEITA ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <section className="border border-frame-gray-3 p-5">
            <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.12em] text-frame-gray-light mb-4">{t("app.finance.clientsByRevenue")}</p>
            {finance.topClients.length ? (
              <div className="space-y-3">
                {finance.topClients.map((client, i) => (
                  <button key={client.id} type="button" onClick={() => setLocation(`/clients/${client.id}/editar`)} className="flex w-full items-center gap-3 text-left group">
                    <span className="w-7 h-7 grid place-items-center bg-frame-orange/10 font-frame-mono text-[0.55rem] text-frame-orange shrink-0">{String(i + 1).padStart(2, "0")}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-frame-white group-hover:text-frame-orange transition">{client.name}</span>
                      <span className="block text-[0.6rem] text-frame-gray-light truncate">{client.company || t("app.finance.direct")}</span>
                    </span>
                    <strong className="text-sm text-frame-white">{formatCurrency(client.revenue)}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-frame-gray-light">{t("app.finance.linkEntries")}</p>
            )}
          </section>

          <section className="border border-frame-gray-3 p-5">
            <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.12em] text-frame-gray-light mb-4">{t("app.finance.revenueByCategory")}</p>
            {finance.revenueSources.length ? (
              <div className="space-y-3">
                {finance.revenueSources.map((source) => {
                  const max = Math.max(...finance.revenueSources.map((s) => s.amount), 1);
                  return (
                    <div key={source.category}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="capitalize text-frame-gray-light">{source.category}</span>
                        <strong className="text-frame-white">{formatCurrency(source.amount)}</strong>
                      </div>
                      <div className="h-1.5 bg-frame-gray-3">
                        <div className="h-full bg-frame-orange transition-all" style={{ width: `${(source.amount / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-frame-gray-light">{t("app.finance.categoriesHint")}</p>
            )}
          </section>
        </div>

        {/* ═══ HISTÓRICO (tabela compacta) ═══ */}
        <section className="border border-frame-gray-3 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.12em] text-frame-gray-light">{t("app.finance.history")}</p>
            <span className="font-frame-mono text-[0.6rem] text-frame-gray-light">{finance.recentEntries.length} {t("app.finance.records")}</span>
          </div>
          {finance.recentEntries.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-frame-gray-3">
                    <th className="text-left py-2.5 px-2 font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-gray-light w-6"></th>
                    <th className="text-left py-2.5 px-2 font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-gray-light">{t("app.finance.descLabel")}</th>
                    <th className="text-left py-2.5 px-2 font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-gray-light hidden sm:table-cell">{t("app.finance.categoryLabel")}</th>
                    <th className="text-right py-2.5 px-2 font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-gray-light cursor-pointer select-none hover:text-frame-orange transition" onClick={() => toggleSort("amount")}>{t("app.finance.valueLabel")} {sortField === "amount" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                    <th className="text-center py-2.5 px-2 font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-gray-light hidden sm:table-cell cursor-pointer select-none hover:text-frame-orange transition" onClick={() => toggleSort("status")}>{t("app.finance.status")} {sortField === "status" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                    <th className="text-right py-2.5 px-2 font-frame-mono text-[0.58rem] uppercase tracking-wider text-frame-gray-light hidden md:table-cell cursor-pointer select-none hover:text-frame-orange transition" onClick={() => toggleSort("date")}>{t("app.finance.dueDate")} {sortField === "date" ? (sortDir === "asc" ? "▲" : "▼") : ""}</th>
                    <th className="py-2.5 px-2 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-frame-gray-3/30">
                  {sortedEntries.map((item) => (
                    <tr key={item.id} className="hover:bg-frame-gray-1/30 transition group">
                      <td className="py-2.5 px-2"><span className={`w-2 h-2 rounded-full inline-block ${item.kind === "income" ? "bg-green-400" : "bg-red-400"}`} /></td>
                      <td className="py-2.5 px-2">
                        <p className="font-medium text-frame-white truncate max-w-[200px]">{item.description}</p>
                        {item.client_name && <p className="text-[0.6rem] text-frame-gray-light">{item.client_name}</p>}
                        <ClientLink clientId={item.client_id ?? null} clientName={item.client_name ?? null} />
                      </td>
                      <td className="py-2.5 px-2 hidden sm:table-cell"><span className="text-xs text-frame-gray-light capitalize">{item.category}</span></td>
                      <td className="py-2.5 px-2 text-right"><span className={`font-semibold ${item.kind === "income" ? "text-green-400" : "text-red-400"}`}>{item.kind === "income" ? "+" : "-"}{formatCurrency(item.amount)}</span></td>
                      <td className="py-2.5 px-2 text-center hidden sm:table-cell">
                        <span className={`text-[0.6rem] font-frame-mono uppercase px-1.5 py-0.5 border ${item.status === "settled" ? "border-green-500/30 text-green-400 bg-green-500/5" : "border-yellow-500/30 text-yellow-400 bg-yellow-500/5"}`}>
                          {item.status === "settled" ? t("app.finance.paid") : t("app.finance.pending")}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right hidden md:table-cell"><span className="text-[0.64rem] text-frame-gray-light font-frame-mono">{formatDate(item.due_date)}</span></td>
                      <td className="py-2.5 px-2 flex items-center gap-0.5">
                        <button type="button" onClick={() => startEditEntry(item)} className="opacity-0 group-hover:opacity-100 text-frame-gray-light hover:text-frame-orange transition p-1"><Pencil className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => deleteEntry(item.id)} className="opacity-0 group-hover:opacity-100 text-frame-gray-light hover:text-red-400 transition p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-frame-gray-light">{t("app.finance.noEntries")}</div>
          )}
        </section>
          </>
        )}

        {/* ═══ FAB: Novo Movimento ═══ */}
        {finance.recentEntries.length > 0 && (
          <button
            type="button"
            onClick={() => setShowEntryForm(true)}
            className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-frame-orange text-frame-black rounded-full shadow-2xl shadow-frame-orange/30 flex items-center justify-center hover:scale-110 hover:shadow-frame-orange/50 transition-all"
            aria-label={t("app.finance.newEntry")}
          >
            <Plus className="w-6 h-6" />
          </button>
        )}
      </main>

      {/* ═══ MODAL: Novo Movimento ═══ */}
      {showEntryForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <button type="button" aria-label="Fechar" className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={() => { setShowEntryForm(false); setEditingEntry(null); }} />
          <div className="relative mx-auto flex min-h-full w-full max-w-lg items-center px-4 py-8">
            <form onSubmit={submitEntry} className="relative w-full bg-frame-black border border-frame-gray-3/60 shadow-2xl shadow-black/40">

              {/* Color accent bar top */}
              <div className={`h-1 w-full ${entry.kind === "income" ? "bg-green-500" : "bg-red-500"}`} />

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4">
                <div>
                  <h2 className="text-lg font-semibold text-frame-white">
                    {editingEntry ? t("app.finance.editEntry") : t("app.finance.newEntry")}
                  </h2>
                </div>
                <button type="button" onClick={() => { setShowEntryForm(false); setEditingEntry(null); }} className="text-frame-gray-light hover:text-frame-white transition p-1.5 hover:bg-frame-gray-1/30">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 pb-6 space-y-5">

                {/* Tipo toggle — full width with strong visual feedback */}
                <div className="grid grid-cols-2 gap-0 border border-frame-gray-3 overflow-hidden">
                  <button type="button" onClick={() => setEntry((c) => ({ ...c, kind: "income" }))} className={`py-3 text-sm font-semibold transition-all relative ${entry.kind === "income" ? "bg-green-500/15 text-green-400" : "text-frame-gray-light hover:text-frame-white bg-frame-gray-1/10"}`}>
                    <span className="relative z-10">↑ {t("app.finance.toggleIncome")}</span>
                    {entry.kind === "income" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-500" />}
                  </button>
                  <button type="button" onClick={() => setEntry((c) => ({ ...c, kind: "expense" }))} className={`py-3 text-sm font-semibold transition-all relative ${entry.kind === "expense" ? "bg-red-500/15 text-red-400" : "text-frame-gray-light hover:text-frame-white bg-frame-gray-1/10"}`}>
                    <span className="relative z-10">↓ {t("app.finance.toggleExpense")}</span>
                    {entry.kind === "expense" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500" />}
                  </button>
                </div>

                {/* Valor — hero field, grande e em destaque */}
                <div className="text-center py-3">
                  <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light block mb-2">{t("app.finance.valueLabel")}</span>
                  <div className="relative inline-flex items-baseline gap-1">
                    <span className="text-lg font-semibold text-frame-gray-light">R$</span>
                    <input
                      className="bg-transparent border-0 outline-none text-center text-3xl font-bold text-frame-white w-48 placeholder:text-frame-gray-3 focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      type="number" min="0" step="0.01"
                      value={entry.amount}
                      onChange={(e) => setEntry((c) => ({ ...c, amount: e.target.value }))}
                      placeholder="0,00"
                      autoFocus
                    />
                  </div>
                  <div className={`h-px w-32 mx-auto mt-1 ${entry.kind === "income" ? "bg-green-500/50" : "bg-red-500/50"}`} />
                </div>

                {/* Descrição */}
                <label className="block">
                  <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light mb-1.5 block">{t("app.finance.descLabel")}</span>
                  <input className="frame-input w-full" value={entry.description} onChange={(e) => setEntry((c) => ({ ...c, description: e.target.value }))} placeholder={t("app.finance.descPlaceholder")} />
                </label>

                {/* Categoria + Cliente */}
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light mb-1.5 block">{t("app.finance.categoryLabel")}</span>
                    <select className="frame-input w-full" value={entry.category} onChange={(e) => setEntry((c) => ({ ...c, category: e.target.value }))}>
                      <option value="projeto">{t("app.finance.catProject")}</option>
                      <option value="mensalidade">{t("app.finance.catSubscription")}</option>
                      <option value="equipe">{t("app.finance.catCrew")}</option>
                      <option value="equipamento">{t("app.finance.catEquipment")}</option>
                      <option value="software">{t("app.finance.catSoftware")}</option>
                      <option value="impostos">{t("app.finance.catTaxes")}</option>
                      <option value="estrutura">{t("app.finance.catStructure")}</option>
                      <option value="outros">{t("app.finance.catOther")}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light mb-1.5 block">{t("app.finance.linkedClient")}</span>
                    <select className="frame-input w-full" value={entry.clientId} onChange={(e) => setEntry((c) => ({ ...c, clientId: e.target.value }))}>
                      <option value="">{t("app.finance.noLink")}</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ""}</option>)}
                    </select>
                  </label>
                </div>

                {/* Data + Status + Recorrência — inline */}
                <div className="grid grid-cols-3 gap-3">
                  <label className="block">
                    <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light mb-1.5 block">{t("app.finance.dueDate")}</span>
                    <input className="frame-input w-full" type="date" value={entry.dueDate} onChange={(e) => setEntry((c) => ({ ...c, dueDate: e.target.value }))} />
                  </label>
                  <label className="block">
                    <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light mb-1.5 block">{t("app.finance.status")}</span>
                    <select className="frame-input w-full" value={entry.status} onChange={(e) => setEntry((c) => ({ ...c, status: e.target.value as EntryForm["status"] }))}>
                      <option value="pending">{t("app.finance.statusPending")}</option>
                      <option value="settled">{entry.kind === "income" ? t("app.finance.statusReceived") : t("app.finance.statusPaid")}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-frame-mono text-[0.55rem] uppercase tracking-wider text-frame-gray-light mb-1.5 block">{t("app.finance.recurrence")}</span>
                    <select className="frame-input w-full" value={entry.recurrence} onChange={(e) => setEntry((c) => ({ ...c, recurrence: e.target.value as EntryForm["recurrence"] }))}>
                      <option value="once">{t("app.finance.recurrenceOnce")}</option>
                      <option value="monthly">{t("app.finance.recurrenceMonthly")}</option>
                    </select>
                  </label>
                </div>

                {/* Custo fixo toggle */}
                <label className="flex items-center gap-2.5 text-xs text-frame-gray-light cursor-pointer select-none">
                  <input type="checkbox" checked={entry.isFixed} onChange={(e) => setEntry((c) => ({ ...c, isFixed: e.target.checked }))} className="accent-frame-orange w-3.5 h-3.5" />
                  {t("app.finance.markFixed")}
                </label>

                {/* Live preview */}
                {(entry.description.trim() || Number(entry.amount) > 0) && (
                  <div className={`border p-3 flex items-center gap-3 ${entry.kind === "income" ? "border-green-500/20 bg-green-500/[0.04]" : "border-red-500/20 bg-red-500/[0.04]"}`}>
                    <span className={`text-base ${entry.kind === "income" ? "text-green-400" : "text-red-400"}`}>
                      {entry.kind === "income" ? "↑" : "↓"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-frame-white truncate">
                        {entry.description || t("app.finance.noDescription")}
                      </p>
                      <p className="text-[0.6rem] text-frame-gray-light mt-0.5">
                        {Number(entry.amount) > 0 && `R$ ${Number(entry.amount).toLocaleString(locale === "en" ? "en-US" : "pt-BR", { minimumFractionDigits: 2 })}`}
                        {entry.clientId && clients.find((c) => String(c.id) === entry.clientId) && ` · ${clients.find((c) => String(c.id) === entry.clientId)!.name}`}
                        {entry.dueDate && ` · ${formatDate(entry.dueDate, locale === "en" ? "en-US" : "pt-BR")}`}
                        {` · ${entry.status === "settled" ? (entry.kind === "income" ? t("app.finance.statusReceived") : t("app.finance.statusPaid")) : t("app.finance.statusPending")}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-frame-gray-3/40 bg-frame-gray-1/10">
                <button type="button" onClick={() => { setShowEntryForm(false); setEditingEntry(null); }} className="frame-btn-ghost text-sm">{t("app.finance.cancel")}</button>
                <button type="submit" disabled={isSaving} className="frame-btn-primary text-sm">
                  {isSaving ? t("app.finance.saving") : (editingEntry ? t("app.finance.editEntry") : t("app.finance.register"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
