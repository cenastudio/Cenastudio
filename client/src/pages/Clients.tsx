import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import AnimatedModal from "@/components/AnimatedModal";
import {
  Users, Plus, Search, Phone, Mail, MoreVertical,
  Edit, Trash2, TrendingUp, DollarSign, GripVertical, Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebounce } from "@/hooks/useDebounce";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, DragStartEvent, DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Client {
  id: number;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  segment: string;
  status: string;
  workflow_stage?: string;
  notes?: string;
  total_spent: number;
  created_at: string;
  updated_at: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  website?: string;
  linkedin?: string;
  instagram?: string;
  industry?: string;
  company_size?: string;
  annual_revenue?: number;
  contact_person?: string;
  contact_role?: string;
  billing_cycle?: string;
  payment_method?: string;
  tax_id?: string;
}

const WORKFLOW_STAGES = [
  { id: "prospect", label: "Prospectado", color: "border-blue-500/30 bg-blue-500/5" },
  { id: "contacted", label: "Contatado", color: "border-yellow-500/30 bg-yellow-500/5" },
  { id: "qualified", label: "Qualificado", color: "border-purple-500/30 bg-purple-500/5" },
  { id: "proposal", label: "Proposta", color: "border-orange-500/30 bg-orange-500/5" },
  { id: "negotiation", label: "Negociação", color: "border-pink-500/30 bg-pink-500/5" },
  { id: "won", label: "Ganho", color: "border-green-500/30 bg-green-500/5" },
  { id: "recurrent", label: "Recorrente", color: "border-cyan-500/30 bg-cyan-500/5" },
  { id: "freela", label: "Freela", color: "border-indigo-500/30 bg-indigo-500/5" },
  { id: "lost", label: "Perdido", color: "border-red-500/30 bg-red-500/5" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const normalizeKey = (value?: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\D/g, "")
    .trim()
    .toLowerCase();

const normalizeTextKey = (value?: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const parseMoney = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) ? Math.round(value) : 0;
  const raw = String(value ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
};

const mapImportedWorkflowStage = (value: unknown, relationshipType?: unknown) => {
  const status = normalizeTextKey(value);
  const relation = normalizeTextKey(relationshipType);
  if (relation.includes("recorrente")) return "recurrent";
  if (status.includes("proposta")) return "proposal";
  if (status.includes("negocia")) return "negotiation";
  if (status.includes("ganho") || status.includes("fechado") || status.includes("aprovado")) return "won";
  if (status.includes("perdido") || status.includes("cancelado")) return "lost";
  if (status.includes("contat")) return "contacted";
  if (status.includes("qualific")) return "qualified";
  return "prospect";
};

const mapImportedStatus = (value: unknown, relationshipType?: unknown) => {
  const status = normalizeTextKey(value);
  const relation = normalizeTextKey(relationshipType);
  if (status.includes("perdido") || status.includes("cancelado")) return "inactive";
  if (status.includes("ganho") || status.includes("fechado") || relation.includes("recorrente")) return "active";
  return "lead";
};

const buildImportedNotes = (client: Record<string, unknown>) => {
  const lines = [
    ["Servico", client.service],
    ["Pagamento", client.payment],
    ["Temperatura do lead", client.leadTemp],
    ["Origem", client.leadSource],
    ["Proxima reuniao", client.nextMeeting],
    ["Proxima acao", client.nextAction],
    ["Follow-up", client.followUpDate],
    ["Tipo de relacionamento", client.relationshipType],
    ["PIX", client.pix],
    ["Portfolio", client.portfolio],
    ["Contrato", client.contract],
    ["Disponibilidade", client.availability],
    ["Termos de parceria", client.partnerTerms],
    ["Permuta", client.barterDetails],
    ["Observacoes", client.notes],
    ["ID original", client.id],
  ]
    .filter(([, value]) => String(value ?? "").trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`);

  return lines.join("\n");
};

const normalizeImportedClient = (client: Record<string, unknown>) => {
  const name = String(client.name ?? client.title ?? client.company ?? "").trim();
  const totalSpent = parseMoney(client.monthlyValue || client.value || client.total_spent);
  return {
    name,
    company: String(client.company ?? "").trim() || undefined,
    email: String(client.email ?? "").trim() || undefined,
    phone: String(client.phone ?? "").trim() || undefined,
    segment: "direct",
    status: mapImportedStatus(client.status, client.relationshipType),
    workflow_stage: mapImportedWorkflowStage(client.status, client.relationshipType),
    notes: buildImportedNotes(client),
    total_spent: totalSpent,
    website: String(client.portfolio ?? "").trim().startsWith("http")
      ? String(client.portfolio).trim()
      : undefined,
    billing_cycle: String(client.relationshipType ?? "").trim() || undefined,
    payment_method: String(client.payment ?? "").trim() || undefined,
  };
};

const extractImportedClients = (payload: unknown) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.clients)) return record.clients;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.customers)) return record.customers;
  }
  return [];
};

function SortableClientCard({
  client,
  onEdit,
  onDelete,
  isDragging,
}: {
  client: Client;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `client-${client.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const stage = WORKFLOW_STAGES.find((s) => s.id === client.workflow_stage) || WORKFLOW_STAGES[0];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`border-l-2 ${stage.color} bg-frame-gray-2/30 p-3 mb-2 cursor-grab active:cursor-grabbing hover:border-l-frame-orange transition-[background-color,border-color,box-shadow,transform] duration-200 group`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm text-frame-white truncate">{client.name}</h4>
          {client.company && (
            <p className="text-xs text-frame-gray-light truncate">{client.company}</p>
          )}
        </div>
        <div className="cursor-grab shrink-0 opacity-45 group-hover:opacity-100 transition" aria-hidden="true">
          <GripVertical className="w-3.5 h-3.5 text-frame-gray-light" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 text-xs text-frame-gray-light">
        {client.email && <Mail className="w-3 h-3 shrink-0" />}
        {client.phone && <Phone className="w-3 h-3 shrink-0" />}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-frame-gray-3">
        <span className="text-xs text-frame-gray-light font-mono">{formatCurrency(client.total_spent)}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              className="p-1 hover:bg-frame-gray-3 rounded transition-colors opacity-0 group-hover:opacity-100"
              aria-label={`Ações de ${client.name}`}
            >
              <MoreVertical className="w-3.5 h-3.5 text-frame-gray-light" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(client)}>
              <Edit className="w-4 h-4 mr-2" /> {t("app.common.edit") as string}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(client)} className="text-red-400">
              <Trash2 className="w-4 h-4 mr-2" /> {t("app.common.delete") as string}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function ColumnHeader({ stage, count }: { stage: typeof WORKFLOW_STAGES[0]; count: number }) {
  const stageColors: Record<string, string> = {
    prospect: "bg-blue-500",
    contacted: "bg-yellow-500",
    qualified: "bg-purple-500",
    proposal: "bg-orange-500",
    negotiation: "bg-pink-500",
    won: "bg-green-500",
    recurrent: "bg-cyan-500",
    freela: "bg-indigo-500",
    lost: "bg-red-500",
  };

  return (
    <div className={`flex items-center justify-between px-3 py-2.5 border-b ${stage.color} bg-frame-gray-1`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${stageColors[stage.id] || "bg-frame-gray-4"}`} />
        <h3 className="font-semibold text-xs text-frame-white uppercase tracking-wider">{stage.label}</h3>
      </div>
      <span className="text-xs font-mono text-frame-gray-light bg-frame-gray-2 px-2 py-0.5">{count}</span>
    </div>
  );
}

function DroppableStageColumn({
  stage,
  children,
}: {
  stage: typeof WORKFLOW_STAGES[0];
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });

  return (
    <div
      ref={setNodeRef}
      className={`clients-stage-column flex-shrink-0 w-[260px] border ${stage.color} bg-frame-black/50 flex flex-col transition-[border-color,box-shadow,background] duration-200 ${isOver ? "is-over border-frame-orange shadow-[0_0_0_1px_rgba(232,80,2,0.38),0_18px_60px_rgba(232,80,2,0.12)]" : ""}`}
      style={{ maxHeight: "calc(100vh - 320px)" }}
    >
      {children}
    </div>
  );
}

interface ClientStats {
  totalClients: number;
  activeClients: number;
  leadClients: number;
  totalRevenue: number;
  bySegment: Array<{ segment: string; count: number }>;
  recentActivity: any[];
}

function ClientsContent() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSegment, setFilterSegment] = useState("");
  const [isImporting, setIsImporting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const loadClients = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append("status", filterStatus);
      if (filterSegment) params.append("segment", filterSegment);
      if (searchTerm) params.append("search", searchTerm);
      const response = await fetch(`/api/clients?${params}`);
      const data = await response.json();
      if (data.success) setClients(data.data);
    } catch (error) {
      console.error("Error loading clients:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus, filterSegment, debouncedSearch]);

  const loadStats = async () => {
    try {
      const response = await fetch("/api/clients/stats");
      const data = await response.json();
      if (data.success) setStats(data.data);
    } catch {
      console.error("Error loading stats");
    }
  };

  useEffect(() => {
    loadClients();
    loadStats();
  }, []);

  useEffect(() => {
    loadClients();
  }, [filterStatus, filterSegment, debouncedSearch]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const clientId = parseInt(String(active.id).replace("client-", ""));
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const overId = String(over.id);
    let targetStage: string | null = null;

    // Check if dropped on a stage column header
    const stageMatch = WORKFLOW_STAGES.find((s) => s.id === overId);
    if (stageMatch) {
      targetStage = stageMatch.id;
    }

    // Check if dropped on another client card -> infer stage from that client
    if (!targetStage && overId.startsWith("client-")) {
      const overClientId = parseInt(overId.replace("client-", ""));
      const overClient = clients.find((c) => c.id === overClientId);
      if (overClient) {
        targetStage = overClient.workflow_stage || "prospect";
      }
    }

    if (targetStage && targetStage !== client.workflow_stage) {
      try {
        const response = await fetch(`/api/clients/${client.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflow_stage: targetStage }),
        });
        if (response.ok) {
          const stageLabel = WORKFLOW_STAGES.find((s) => s.id === targetStage)?.label || targetStage;
          toast.success(`${client.name} movido para ${stageLabel}`);
          loadClients();
        }
      } catch {
        toast.error("Erro ao mover cliente");
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/clients/${selectedClient.id}`, { method: "DELETE" });
      const data = await response.json();
      if (data.success) {
        toast.success(t("app.clients.clientDeleted") as string);
        setIsDeleteOpen(false);
        setSelectedClient(null);
        loadClients();
        loadStats();
      } else {
        toast.error(data.error || t("app.errors.generic") as string);
      }
    } catch {
      toast.error(t("app.errors.generic") as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportFile = async (file?: File | null) => {
    if (!file || isImporting) return;

    setIsImporting(true);
    try {
      const payload = JSON.parse(await file.text());
      const imported = extractImportedClients(payload)
        .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
        .map(normalizeImportedClient)
        .filter((client) => client.name);

      if (imported.length === 0) {
        toast.error(t("app.errors.generic") as string);
        return;
      }

      const existingResponse = await fetch("/api/clients");
      const existingData = await existingResponse.json();
      const existingClients: Client[] = existingData.success ? existingData.data : clients;
      const existingKeys = new Set(
        existingClients.map((client) =>
          [
            normalizeTextKey(client.name),
            normalizeTextKey(client.email),
            normalizeKey(client.phone),
          ].filter(Boolean).join("|"),
        ),
      );

      let created = 0;
      let skipped = 0;

      for (const client of imported) {
        const key = [
          normalizeTextKey(client.name),
          normalizeTextKey(client.email),
          normalizeKey(client.phone),
        ].filter(Boolean).join("|");

        if (existingKeys.has(key)) {
          skipped += 1;
          continue;
        }

        const response = await fetch("/api/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(client),
        });
        const result = await response.json();
        if (result.success) {
          created += 1;
          existingKeys.add(key);
        } else {
          skipped += 1;
        }
      }

      await loadClients();
      await loadStats();
      toast.success(`${created} cliente(s) importado(s). ${skipped} ignorado(s).`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error(t("app.errors.generic") as string);
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-400 bg-green-400/10 border-green-400/20";
      case "lead": return "text-blue-400 bg-blue-400/10 border-blue-400/20";
      case "inactive": return "text-gray-400 bg-gray-400/10 border-gray-400/20";
      default: return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active": return t("app.collaborators.active") as string;
      case "lead": return t("app.pipeline.lead") as string;
      case "inactive": return t("app.collaborators.inactive") as string;
      default: return status;
    }
  };

  const activeDragClient = activeDragId
    ? clients.find((c) => `client-${c.id}` === activeDragId)
    : null;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />

      <main id="main-content" className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-frame-orange font-frame-mono text-xs tracking-[0.2em] uppercase mb-2">// {t("app.clients.title") as string}</p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t("app.clients.title") as string}</h1>
            <p className="text-frame-gray-light text-sm mt-2">{t("app.clients.noClientsDesc") as string}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="frame-btn-ghost flex items-center justify-center gap-2 shrink-0">
              <Upload className="w-4 h-4" />
              {isImporting ? t("app.common.loading") as string : t("app.common.import") as string}
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={isImporting}
                onChange={(event) => {
                  void handleImportFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button
              onClick={() => setLocation("/clients/new")}
              className="frame-btn-primary flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              {t("app.clients.newClient") as string}
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: t("app.common.all") as string, value: stats.totalClients, icon: Users, color: "text-frame-orange bg-frame-orange/10" },
              { label: t("app.clients.activeClients") as string, value: stats.activeClients, icon: TrendingUp, color: "text-green-400 bg-green-500/10" },
              { label: "Leads", value: stats.leadClients, icon: Users, color: "text-blue-400 bg-blue-500/10" },
              { label: t("app.clients.totalSpent") as string, value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "text-green-400 bg-green-500/10" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="border border-frame-gray-3 bg-frame-gray-1/20 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.6rem] text-frame-gray-light font-frame-mono uppercase tracking-wider">{item.label}</p>
                    <p className="text-xl font-bold truncate">{item.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
            <input
              type="text"
              placeholder={t("app.clients.search") as string}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-frame-gray-2 border border-frame-gray-3 pl-10 pr-4 py-2 text-sm outline-none focus:border-frame-orange"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-frame-gray-2 border border-frame-gray-3 px-4 py-2 text-sm outline-none focus:border-frame-orange"
          >
            <option value="">{t("app.common.all") as string}</option>
            <option value="active">{t("app.collaborators.active") as string}</option>
            <option value="lead">{t("app.pipeline.lead") as string}</option>
            <option value="inactive">{t("app.collaborators.inactive") as string}</option>
          </select>
          <select
            value={filterSegment}
            onChange={(e) => setFilterSegment(e.target.value)}
            className="bg-frame-gray-2 border border-frame-gray-3 px-4 py-2 text-sm outline-none focus:border-frame-orange"
          >
            <option value="">{t("app.common.all") as string}</option>
            <option value="direct">Direto</option>
            <option value="agency">Agência</option>
            <option value="brand">Marca</option>
          </select>
        </div>

        {/* Main Content with Sidebar */}
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-56 shrink-0 space-y-4">
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <p className="font-frame-mono text-[0.64rem] tracking-[0.2em] uppercase text-frame-orange mb-3">{t("app.common.filter") as string}</p>
              <div className="space-y-2">
                 <button onClick={() => setLocation("/clients/new")} className="w-full text-left text-sm text-frame-gray-light hover:text-frame-white transition px-2 py-1.5 border border-frame-gray-3 hover:border-frame-orange/50">
                  + {t("app.clients.newClient") as string}
                </button>
                <label className="block w-full text-left text-sm text-frame-gray-light hover:text-frame-white transition px-2 py-1.5 border border-frame-gray-3 hover:border-frame-orange/50 cursor-pointer">
                  {t("app.common.import") as string}
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    disabled={isImporting}
                    onChange={(event) => {
                      void handleImportFile(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <p className="font-frame-mono text-[0.64rem] tracking-[0.2em] uppercase text-frame-orange mb-3">{t("app.clients.segment") as string}</p>
              <div className="space-y-1.5">
                {[
                  { id: "", label: t("app.common.all") as string, color: "bg-frame-gray-3" },
                  { id: "direct", label: "Direto", color: "bg-blue-400" },
                  { id: "agency", label: "Agência", color: "bg-purple-400" },
                  { id: "brand", label: "Marca", color: "bg-green-400" },
                ].map((seg) => (
                  <button
                    key={seg.id}
                    onClick={() => setFilterSegment(seg.id)}
                    className={`w-full text-left text-xs flex items-center gap-2 px-2 py-1.5 transition ${
                      filterSegment === seg.id ? "text-frame-white bg-frame-gray-2" : "text-frame-gray-light hover:text-frame-white"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${seg.color}`} />
                    {seg.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <p className="font-frame-mono text-[0.64rem] tracking-[0.2em] uppercase text-frame-orange mb-3">{t("app.clients.workflowStage") as string}</p>
              <div className="space-y-1.5">
                {[
                  { id: "", label: t("app.common.all") as string, color: "bg-frame-gray-3" },
                  { id: "active", label: t("app.collaborators.active") as string, color: "bg-green-400" },
                  { id: "lead", label: t("app.pipeline.lead") as string, color: "bg-blue-400" },
                  { id: "inactive", label: t("app.collaborators.inactive") as string, color: "bg-red-400" },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setFilterStatus(st.id)}
                    className={`w-full text-left text-xs flex items-center gap-2 px-2 py-1.5 transition ${
                      filterStatus === st.id ? "text-frame-white bg-frame-gray-2" : "text-frame-gray-light hover:text-frame-white"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${st.color}`} />
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
            {stats && (
              <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
                <p className="font-frame-mono text-[0.64rem] tracking-[0.2em] uppercase text-frame-orange mb-3">{t("app.clients.stats") as string}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-frame-gray-light">{t("app.common.all") as string}</span>
                    <span className="font-semibold">{stats.totalClients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-400">{t("app.clients.activeClients") as string}</span>
                    <span className="font-semibold">{stats.activeClients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-400">{t("app.pipeline.lead") as string}</span>
                    <span className="font-semibold">{stats.leadClients}</span>
                  </div>
                  {stats.bySegment.length > 0 && (
                    <>
                      <div className="border-t border-frame-gray-3 my-1" />
                      {stats.bySegment.map((s) => (
                        <div key={s.segment} className="flex justify-between">
                          <span className="text-frame-gray-light">{s.segment || t("app.common.none") as string}</span>
                          <span className="font-semibold">{s.count}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Kanban Board */}
          <div className="flex-1 min-w-0">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin" style={{ minHeight: "500px" }}>
            {WORKFLOW_STAGES.map((stage) => {
              const stageClients = clients.filter((c) => c.workflow_stage === stage.id);
              return (
                <DroppableStageColumn key={stage.id} stage={stage}>
                  <ColumnHeader stage={stage} count={stageClients.length} />
                  <SortableContext
                    items={stageClients.map((c) => `client-${c.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="flex-1 overflow-y-auto p-2 space-y-0">
                      <AnimatePresence>
                        {stageClients.map((client) => (
                          <motion.div
                            key={client.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                          >
                            <SortableClientCard
                               client={client}
                               onEdit={(c) => setLocation(`/clients/${c.id}/editar`)}
                               onDelete={(c) => { setSelectedClient(c); setIsDeleteOpen(true); }}
                               isDragging={activeDragId === `client-${client.id}`}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </SortableContext>
                </DroppableStageColumn>
              );
            })}
          </div>

          <DragOverlay>
            {activeDragClient ? (
              <div className="w-[260px] border-l-2 border-frame-orange bg-frame-gray-2/80 p-3 shadow-2xl">
                <h4 className="font-semibold text-sm text-frame-white">{activeDragClient.name}</h4>
                {activeDragClient.company && (
                  <p className="text-xs text-frame-gray-light">{activeDragClient.company}</p>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Empty State */}
        {!isLoading && clients.length === 0 && (
          <div className="border border-dashed border-frame-gray-3 p-12 text-center">
            <Users className="w-12 h-12 text-frame-gray-light mx-auto mb-4" />
            <p className="text-frame-gray-light mb-4">{t("app.clients.noClients") as string}</p>
            <button
              onClick={() => setLocation("/clients/new")}
              className="frame-btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t("app.clients.newClient") as string}
            </button>
          </div>
        )}
        </div>{/* end kanban flex-1 */}
      </div>{/* end sidebar layout */}
      </main>



      {/* Delete Modal */}
      <AnimatedModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title={`${t("app.common.delete") as string} ${t("app.clients.title") as string}`}
        description={t("app.common.confirmDelete") as string}
        className="max-w-md"
        footer={
          <div className="flex gap-3 w-full">
            <button type="button" onClick={() => setIsDeleteOpen(false)} disabled={isSubmitting} className="frame-btn-ghost flex-1">
              {t("app.common.cancel") as string}
            </button>
            <button type="button" onClick={handleDelete} disabled={isSubmitting} className="frame-btn-danger flex-1">
              {isSubmitting ? t("app.common.loading") as string : t("app.common.delete") as string}
            </button>
          </div>
        }
      >
        <div className="flex items-center gap-4 mt-4 p-4 border border-frame-red/30 bg-frame-red/5">
          <Trash2 className="w-5 h-5 text-frame-red shrink-0" />
          <div>
            <p className="font-semibold text-frame-white">{selectedClient?.name}</p>
            {selectedClient?.company && (
              <p className="text-sm text-frame-gray-light">{selectedClient.company}</p>
            )}
          </div>
        </div>
      </AnimatedModal>
    </div>
  );
}

export default function Clients() {
  return (
    <ProtectedRoute>
      <ClientsContent />
    </ProtectedRoute>
  );
}
