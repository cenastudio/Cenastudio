import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Plus,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Clock,
  User,
  Building2,
  Edit,
  Trash2,
  Filter,
  MoreVertical,
} from "lucide-react";
import EmptyState from "@/components/EmptyState";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

interface Interaction {
  id: number;
  clientId: number | null;
  opportunityId: number | null;
  client_name?: string;
  client_company?: string;
  opportunity_title?: string;
  type: string;
  direction: string;
  summary: string;
  outcome: string | null;
  next_follow_up: string | null;
  created_at: string;
  updated_at: string;
}

const INTERACTION_TYPES = [
  { id: "call", label: "Ligação", icon: Phone },
  { id: "email", label: "Email", icon: Mail },
  { id: "meeting", label: "Reunião", icon: User },
  { id: "message", label: "Mensagem", icon: MessageSquare },
];

const DIRECTIONS = [
  { id: "inbound", label: "Recebido" },
  { id: "outbound", label: "Enviado" },
];

function InteractionsContent() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);

  // Form states
  const [type, setType] = useState("call");
  const [direction, setDirection] = useState("outbound");
  const [summary, setSummary] = useState("");
  const [outcome, setOutcome] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [clientId, setClientId] = useState("");
  const [opportunityId, setOpportunityId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter states
  const [filterType, setFilterType] = useState("");
  const [filterClient, setFilterClient] = useState("");

  const [clients, setClients] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);

  useEffect(() => {
    loadInteractions();
    loadClients();
    loadOpportunities();
  }, []);

  const loadInteractions = async () => {
    try {
      const params = new URLSearchParams();
      if (filterType) params.append("type", filterType);
      if (filterClient) params.append("clientId", filterClient);

      const response = await fetch(`/api/clients/interactions?${params}`);
      const data = await response.json();
      if (data.success) {
        setInteractions(data.data);
      }
    } catch (error) {
      console.error("Error loading interactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await fetch("/api/clients");
      const data = await response.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (error) {
      console.error("Error loading clients:", error);
    }
  };

  const loadOpportunities = async () => {
    try {
      const response = await fetch("/api/clients/opportunities");
      const data = await response.json();
      if (data.success) {
        setOpportunities(data.data);
      }
    } catch (error) {
      console.error("Error loading opportunities:", error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/clients/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          direction,
          summary: summary.trim(),
          outcome: outcome.trim() || undefined,
          nextFollowUp: nextFollowUp || undefined,
          clientId: clientId ? parseInt(clientId) : undefined,
          opportunityId: opportunityId ? parseInt(opportunityId) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t("app.interactions.interactionCreated"));
        setIsCreateOpen(false);
        resetForm();
        loadInteractions();
      } else {
        toast.error(data.error || t("app.errors.registerInteraction"));
      }
    } catch (error) {
      toast.error(t("app.errors.registerInteraction"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInteraction || !summary.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/clients/interactions/${selectedInteraction.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          direction,
          summary: summary.trim(),
          outcome: outcome.trim() || undefined,
          nextFollowUp: nextFollowUp || undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t("app.interactions.interactionUpdated"));
        setIsEditOpen(false);
        resetForm();
        loadInteractions();
      } else {
        toast.error(data.error || t("app.errors.updateInteraction"));
      }
    } catch (error) {
      toast.error(t("app.errors.updateInteraction"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedInteraction) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/clients/interactions/${selectedInteraction.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        toast.success(t("app.interactions.interactionDeleted"));
        setIsDeleteOpen(false);
        setSelectedInteraction(null);
        loadInteractions();
      } else {
        toast.error(data.error || t("app.errors.deleteInteraction"));
      }
    } catch (error) {
      toast.error(t("app.errors.deleteInteraction"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (interaction: Interaction) => {
    setSelectedInteraction(interaction);
    setType(interaction.type);
    setDirection(interaction.direction);
    setSummary(interaction.summary);
    setOutcome(interaction.outcome || "");
    setNextFollowUp(interaction.next_follow_up || "");
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setType("call");
    setDirection("outbound");
    setSummary("");
    setOutcome("");
    setNextFollowUp("");
    setClientId("");
    setOpportunityId("");
    setSelectedInteraction(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInteractionIcon = (type: string) => {
    const interactionType = INTERACTION_TYPES.find((t) => t.id === type);
    if (!interactionType) return Phone;
    return interactionType.icon;
  };

  const getFilteredInteractions = () => {
    return interactions.filter((interaction) => {
      if (filterType && interaction.type !== filterType) return false;
      if (filterClient && interaction.clientId !== parseInt(filterClient)) return false;
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="frame-label mb-2">// CRM</p>
            <h1 className="frame-title text-[clamp(2.1rem,4vw,3.5rem)]">
              INTERAÇÕES
            </h1>
            <p className="text-frame-gray-light text-sm mt-2">
              Histórico de comunicações com clientes
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsCreateOpen(true);
            }}
            className="frame-btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Interação
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 border border-frame-gray-3 bg-frame-gray-1/10 p-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-frame-orange" />
            <span className="font-frame-mono text-xs uppercase tracking-wider">Filtros:</span>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
          >
            <option value="">Todos os tipos</option>
            {INTERACTION_TYPES.map((type) => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>

          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
          >
            <option value="">Todos os clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company ? `${client.name} (${client.company})` : client.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setFilterType("");
              setFilterClient("");
              loadInteractions();
            }}
            className="frame-btn-ghost text-xs"
          >
            Limpar Filtros
          </button>
        </div>

        {/* Interactions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-frame-orange" />
          </div>
        ) : getFilteredInteractions().length === 0 ? (
          <EmptyState icon={MessageSquare} title={t("app.interactions.noInteractions")} />
        ) : (
          <div className="space-y-4">
            {getFilteredInteractions().map((interaction) => {
              const Icon = getInteractionIcon(interaction.type);

              return (
                <motion.div
                  key={interaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-frame-gray-3 bg-frame-gray-1/10 p-4 hover:border-frame-orange/50 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${
                      interaction.direction === "inbound" 
                        ? "bg-blue-500/10 text-blue-400" 
                        : "bg-frame-orange/10 text-frame-orange"
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-frame-mono text-xs uppercase tracking-wider text-frame-orange">
                              {INTERACTION_TYPES.find((t) => t.id === interaction.type)?.label}
                            </span>
                            <span className="text-xs text-frame-gray-light">
                              {interaction.direction === "inbound" ? "← " + t("app.interactions.inbound") : "→ " + t("app.interactions.outbound")}
                            </span>
                          </div>

                          {interaction.client_name && (
                            <div className="flex items-center gap-1 text-sm text-frame-gray-light">
                              <Building2 className="w-3 h-3" />
                              <span>{interaction.client_name}</span>
                              {interaction.client_company && (
                                <span className="text-frame-gray-light/60">({interaction.client_company})</span>
                              )}
                            </div>
                          )}

                          {interaction.opportunity_title && (
                            <div className="text-xs text-frame-gray-light mt-1">
                              {t("app.interactions.opportunity")}: {interaction.opportunity_title}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-frame-gray-light font-frame-mono">
                          <Clock className="w-3 h-3" />
                          {formatDate(interaction.created_at)}
                        </div>
                      </div>

                      <p className="text-sm text-frame-white mb-3">{interaction.summary}</p>

                      {interaction.outcome && (
                        <div className="bg-frame-gray-2 border-l-2 border-frame-orange p-3 mb-3">
                          <p className="text-xs text-frame-gray-light font-frame-mono uppercase tracking-wider mb-1">
                            Resultado
                          </p>
                          <p className="text-sm">{interaction.outcome}</p>
                        </div>
                      )}

                      {interaction.next_follow_up && (
                        <div className="flex items-center gap-2 text-xs text-frame-orange">
                          <Calendar className="w-3 h-3" />
                          <span>Próximo follow-up: {formatDate(interaction.next_follow_up)}</span>
                        </div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-frame-gray-3 transition rounded-none">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-frame-black border-frame-gray-3">
                        <DropdownMenuItem
                          onClick={() => openEditModal(interaction)}
                          className="cursor-pointer"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedInteraction(interaction);
                            setIsDeleteOpen(true);
                          }}
                          className="cursor-pointer text-frame-red"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">NOVA INTERAÇÃO</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Registre uma nova comunicação com cliente
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  Tipo
                </label>
                <select
                  disabled={isSubmitting}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  {INTERACTION_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  Direção
                </label>
                <select
                  disabled={isSubmitting}
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  Cliente
                </label>
                <select
                  disabled={isSubmitting}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  <option value="">Nenhum cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company ? `${client.name} (${client.company})` : client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  Oportunidade
                </label>
                <select
                  disabled={isSubmitting}
                  value={opportunityId}
                  onChange={(e) => setOpportunityId(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  <option value="">Nenhuma oportunidade</option>
                  {opportunities.map((opp) => (
                    <option key={opp.id} value={opp.id}>
                      {opp.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                Resumo *
              </label>
              <textarea
                required
                disabled={isSubmitting}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none resize-none h-24"
                placeholder={t("app.interactions.summaryPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                Resultado
              </label>
              <textarea
                disabled={isSubmitting}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none resize-none h-20"
                placeholder={t("app.interactions.outcomePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                Próximo Follow-up
              </label>
              <input
                type="datetime-local"
                disabled={isSubmitting}
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCreateOpen(false)}
                className="frame-btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !summary.trim()}
                className="frame-btn-primary"
              >
                {isSubmitting ? t("app.interactions.registering") : t("app.interactions.registerInteraction")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl">EDITAR INTERAÇÃO</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Atualize os detalhes da interação
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  Tipo
                </label>
                <select
                  disabled={isSubmitting}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  {INTERACTION_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                  Direção
                </label>
                <select
                  disabled={isSubmitting}
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
                >
                  {DIRECTIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                Resumo *
              </label>
              <textarea
                required
                disabled={isSubmitting}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none resize-none h-24"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                Resultado
              </label>
              <textarea
                disabled={isSubmitting}
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none resize-none h-20"
              />
            </div>

            <div className="space-y-2">
              <label className="block font-frame-mono text-xs text-frame-orange uppercase">
                Próximo Follow-up
              </label>
              <input
                type="datetime-local"
                disabled={isSubmitting}
                value={nextFollowUp}
                onChange={(e) => setNextFollowUp(e.target.value)}
                className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange rounded-none"
              />
            </div>

            <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsEditOpen(false)}
                className="frame-btn-ghost"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !summary.trim()}
                className="frame-btn-primary"
              >
                {isSubmitting ? t("app.interactions.updating") : t("app.interactions.updateInteraction")}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-sm rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="frame-title text-2xl text-frame-red">EXCLUIR INTERAÇÃO?</DialogTitle>
            <DialogDescription className="text-frame-gray-light text-sm">
              Esta ação é permanente.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 pt-4 border-t border-frame-gray-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsDeleteOpen(false)}
              className="frame-btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDelete}
              className="bg-frame-red hover:bg-red-600 text-white px-4 py-2 text-sm font-frame-mono uppercase tracking-wider transition rounded-none"
            >
              {isSubmitting ? t("app.interactions.deleting") : t("app.common.delete")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Interactions() {
  return (
    <ProtectedRoute>
      <InteractionsContent />
    </ProtectedRoute>
  );
}
