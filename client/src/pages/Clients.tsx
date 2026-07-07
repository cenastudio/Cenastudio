import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import EmptyState from "@/components/EmptyState";
import ConfirmDialog from "@/components/ConfirmDialog";
import { SkeletonCard } from "@/components/skeletons";
import { ExportButton } from "@/components/ExportButton";
import { Users, Plus, Search, Phone, Mail, MapPin, Edit, Trash2, TrendingUp, DollarSign, Upload, ChevronRight, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { motion } from "framer-motion";

interface Client {
  id: number; name: string; company?: string; email?: string; phone?: string;
  segment: string; status: string; workflow_stage?: string; total_spent: number;
  city?: string; state?: string; contact_person?: string; contact_role?: string;
}

const STAGE_COLORS: Record<string, string> = {
  prospect: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  contacted: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  qualified: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  proposal: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  negotiation: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  won: "bg-green-500/15 text-green-400 border-green-500/30",
  recurrent: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  freela: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  lost: "bg-red-500/15 text-red-400 border-red-500/30",
};

const SEGMENT_COLORS: Record<string, string> = {
  direct: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  agency: "bg-purple-500/10 text-purple-300 border-purple-500/20",
  brand: "bg-green-500/10 text-green-300 border-green-500/20",
};

const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const norm = (v?: unknown) => String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const extractImported = (p: unknown) => {
  if (Array.isArray(p)) return p;
  if (p && typeof p === "object") {
    const r = p as Record<string, unknown>;
    return Array.isArray(r.clients) ? r.clients : Array.isArray(r.data) ? r.data : Array.isArray(r.customers) ? r.customers : [];
  }
  return [];
};

function ClientCard({ client, onEdit, onDelete, onClick }: { client: Client; onEdit: () => void; onDelete: () => void; onClick: () => void }) {
  const { t } = useLanguage();
  const stageClass = STAGE_COLORS[client.workflow_stage || "prospect"] || STAGE_COLORS.prospect;
  const segmentClass = SEGMENT_COLORS[client.segment] || SEGMENT_COLORS.direct;

  const STAGE_LABELS: Record<string, string> = {
    prospect: t("app.clients.stageProspect") || "Prospectado",
    contacted: t("app.clients.stageContacted") || "Contatado",
    qualified: t("app.clients.stageQualified") || "Qualificado",
    proposal: t("app.clients.stageProposal") || "Proposta",
    negotiation: t("app.clients.stageNegotiation") || "Negociação",
    won: t("app.clients.stageWon") || "Ganho",
    recurrent: t("app.clients.stageRecurrent") || "Recorrente",
    freela: t("app.clients.stageFreela") || "Freela",
    lost: t("app.clients.stageLost") || "Perdido",
  };

  const SEGMENT_LABELS: Record<string, string> = {
    direct: t("app.common.segmentDirect") || "Direto",
    agency: t("app.common.segmentAgency") || "Agência",
    brand: t("app.common.segmentBrand") || "Marca",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glow-card border border-frame-gray-3 bg-frame-gray-1/20 p-4 group cursor-pointer hover:border-frame-orange/40 hover:bg-frame-orange/[0.02] transition-all duration-200"
      onClick={onClick}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-semibold text-frame-white group-hover:text-frame-orange transition truncate">{client.name}</h3>
            <span className={`text-[0.6rem] font-medium px-2 py-0.5 border rounded-full uppercase tracking-wider ${stageClass}`}>
              {STAGE_LABELS[client.workflow_stage || "prospect"] || client.workflow_stage || "prospect"}
            </span>
            {client.segment && (
              <span className={`text-[0.6rem] font-medium px-2 py-0.5 border rounded-full uppercase tracking-wider ${segmentClass}`}>{SEGMENT_LABELS[client.segment] || client.segment}</span>
            )}
          </div>
          {client.company && <p className="text-xs text-frame-gray-light truncate">{client.company}</p>}
          {(client.contact_person || client.contact_role) && (
            <p className="text-xs text-frame-gray-light">{client.contact_person}{client.contact_role ? ` · ${client.contact_role}` : ""}</p>
          )}
          <div className="flex items-center gap-4 flex-wrap text-xs text-frame-gray-light pt-1">
            {client.phone && <a href={`tel:${client.phone}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-frame-orange transition"><Phone className="w-3 h-3" /> {client.phone}</a>}
            {client.email && <a href={`mailto:${client.email}`} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 hover:text-frame-orange transition"><Mail className="w-3 h-3" /> {client.email}</a>}
            {(client.city || client.state) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {[client.city, client.state].filter(Boolean).join(", ")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-frame-mono text-sm text-frame-orange font-semibold">{formatCurrency(client.total_spent)}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-1.5 text-frame-gray-light hover:text-frame-orange hover:bg-frame-orange/10 rounded transition" title={t("app.common.edit") as string}><Edit className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-frame-gray-light hover:text-red-400 hover:bg-red-400/10 rounded transition" title={t("app.common.delete") as string}><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
          <ChevronRight className="w-4 h-4 text-frame-gray-light group-hover:text-frame-orange transition" />
        </div>
      </div>
    </motion.div>
  );
}

function ClientsContent({ embedded }: { embedded?: boolean }) {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<{ totalClients: number; activeClients: number; leadClients: number; totalRevenue: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSegment, setFilterSegment] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const loadClients = useCallback(async () => {
    setIsLoading(true); setLoadError(false);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterSegment) params.append("segment", filterSegment);
      if (debouncedSearch) params.append("search", debouncedSearch);
      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error();
      setClients(data.data);
    } catch { setClients([]); setLoadError(true); }
    finally { setIsLoading(false); }
  }, [filterStatus, filterSegment, debouncedSearch]);

  const loadStats = async () => {
    try { const res = await fetch("/api/clients/stats"); const data = await res.json(); if (data.success) setStats(data.data); } catch { /* silent */ }
  };

  useEffect(() => { loadClients(); loadStats(); }, []);
  useEffect(() => { loadClients(); }, [filterStatus, filterSegment, debouncedSearch]);

  const handleDelete = async () => {
    if (!selectedClient) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${selectedClient.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) { toast.success(t("app.clients.clientDeleted") as string); setIsDeleteOpen(false); setSelectedClient(null); loadClients(); loadStats(); }
      else toast.error(data.error || t("app.errors.generic") as string);
    } catch { toast.error(t("app.errors.generic") as string); }
    finally { setIsSubmitting(false); }
  };

  const handleImportFile = async (file?: File | null) => {
    if (!file || isImporting) return;
    setIsImporting(true);
    try {
      const payload = JSON.parse(await file.text());
      const imported = extractImported(payload)
        .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === "object")
        .map((c) => ({ name: String(c.name ?? c.title ?? c.company ?? "").trim(), company: String(c.company ?? "").trim() || undefined, email: String(c.email ?? "").trim() || undefined, phone: String(c.phone ?? "").trim() || undefined, segment: "direct", status: "lead", workflow_stage: "prospect", total_spent: 0 }))
        .filter((c) => c.name);
      if (!imported.length) { toast.error(t("app.errors.generic") as string); return; }

      const existing = await fetch("/api/clients").then((r) => r.json());
      const keys = new Set((existing.success ? existing.data : clients).map((c: Client) => norm(c.name)));
      let created = 0, skipped = 0;
      for (const client of imported) {
        if (keys.has(norm(client.name))) { skipped++; continue; }
        const r = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(client) });
        const d = await r.json(); if (d.success) { created++; keys.add(norm(client.name)); } else skipped++;
      }
      await loadClients(); await loadStats();
      toast.success((t("app.clients.importSuccess") as string).replace("{created}", String(created)).replace("{skipped}", String(skipped)));
    } catch { toast.error(t("app.errors.generic") as string); }
    finally { setIsImporting(false); }
  };

  const hasActiveFilters = Boolean(debouncedSearch.trim() || filterStatus || filterSegment);
  const clearFilters = () => { setSearchTerm(""); setFilterStatus(""); setFilterSegment(""); };

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-frame-black text-frame-white font-frame-body flex flex-col`}>
      {!embedded && <AppNavBar />}
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 border-b border-frame-gray-3 pb-6">
          <div>
            <p className="frame-label mb-2">{t("app.clients.eyebrow") as string}</p>
            <h1 className="frame-title text-[clamp(1.8rem,3.5vw,2.8rem)]">{t("app.clients.pageTitle") as string}</h1>
            <p className="text-frame-gray-light text-sm mt-2 max-w-lg leading-relaxed">{t("app.clients.pageDescription") as string}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <ExportButton entityType="clients" variant="outline" size="default" />
            <label className="frame-btn-ghost flex items-center justify-center gap-2 shrink-0 cursor-pointer">
              <Upload className="w-4 h-4" /> {isImporting ? t("app.common.loading") as string : t("app.common.import") as string}
              <input type="file" accept="application/json,.json" className="sr-only" disabled={isImporting} onChange={(e) => { void handleImportFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            </label>
            <button onClick={() => setLocation("/clients/new")} className="frame-btn-primary flex items-center justify-center gap-2 shrink-0">
              <Plus className="w-4 h-4" /> {t("app.clients.newClient") as string}
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: t("app.clients.totalClients") as string || "Total", value: stats.totalClients, icon: Users, color: "text-frame-orange bg-frame-orange/10" },
              { label: t("app.clients.activeClients") as string, value: stats.activeClients, icon: TrendingUp, color: "text-green-400 bg-green-500/10" },
              { label: "Leads", value: stats.leadClients, icon: Users, color: "text-blue-400 bg-blue-500/10" },
              { label: t("app.clients.totalSpent") as string || "Valor acumulado", value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "text-green-400 bg-green-500/10" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.color}`}><item.icon className="w-5 h-5" /></div>
                  <div className="min-w-0">
                    <p className="text-[0.6rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">{item.label}</p>
                    <p className="text-xl font-bold truncate">{item.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
            <input type="text" placeholder={t("app.clients.search") as string} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="frame-input w-full pl-10 pr-4 py-2 text-sm" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-frame-gray-2 border border-frame-gray-3 px-4 py-2 text-sm outline-none focus:border-frame-orange">
            <option value="">{t("app.common.all") as string}</option>
            <option value="active">{t("app.collaborators.active") as string}</option>
            <option value="lead">{t("app.pipeline.lead") as string}</option>
            <option value="inactive">{t("app.collaborators.inactive") as string}</option>
          </select>
          <select value={filterSegment} onChange={(e) => setFilterSegment(e.target.value)} className="bg-frame-gray-2 border border-frame-gray-3 px-4 py-2 text-sm outline-none focus:border-frame-orange">
            <option value="">{t("app.common.all") as string}</option>
            <option value="direct">{t("app.common.segmentDirect") as string}</option>
            <option value="agency">{t("app.common.segmentAgency") as string}</option>
            <option value="brand">{t("app.common.segmentBrand") as string}</option>
          </select>
          {hasActiveFilters && <button type="button" onClick={clearFilters} className="frame-btn-ghost text-sm">{t("app.clients.clearFilters") as string}</button>}
        </div>

        {/* Client List */}
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}</div>
        ) : loadError ? (
          <EmptyState icon={AlertCircle} title={t("app.clients.loadError") as string} description={t("app.clients.loadErrorDescription") as string} action={{ label: t("app.common.tryAgain") as string, onClick: loadClients }} />
        ) : clients.length === 0 ? (
          <div className="py-16"><EmptyState icon={Users} title={hasActiveFilters ? t("app.clients.emptyFilteredTitle") as string : t("app.clients.emptyTitle") as string} description={hasActiveFilters ? t("app.clients.emptyFilteredDesc") as string : t("app.clients.emptyDesc") as string} action={{ label: hasActiveFilters ? t("app.clients.clearFilters") as string : t("app.clients.newClient") as string, onClick: hasActiveFilters ? clearFilters : () => setLocation("/clients/new") }} /></div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} onClick={() => setLocation(`/clients/${client.id}`)} onEdit={() => setLocation(`/clients/${client.id}/editar`)} onDelete={() => { setSelectedClient(client); setIsDeleteOpen(true); }} />
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} onConfirm={handleDelete}
        title={`${t("app.common.delete") as string} ${t("app.clients.title") as string}`} description={t("app.common.confirmDelete") as string}
        confirmText={t("app.common.delete") as string} cancelText={t("app.common.cancel") as string} variant="delete" isLoading={isSubmitting}
        itemName={selectedClient ? `${selectedClient.name}${selectedClient.company ? ` (${selectedClient.company})` : ""}` : undefined} />
    </div>
  );
}

export default function Clients({ embedded }: { embedded?: boolean }) {
  if (embedded) return <ClientsContent embedded />;
  return <ProtectedRoute><ClientsContent /></ProtectedRoute>;
}
