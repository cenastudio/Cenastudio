import React, { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import AnimatedModal from "@/components/AnimatedModal";
import EmptyState from "@/components/EmptyState";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Edit,
  Eye,
  Filter,
  Inbox,
  MoreVertical,
  Plus,
  Search,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import type { Translate } from "@/contexts/LanguageContext";

interface Opportunity {
  id: number;
  client_id?: number | null;
  clientId?: number | null;
  client_name?: string;
  client_company?: string;
  title: string;
  stage: string;
  estimated_value: number | null;
  probability: number;
  expected_close_date: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface PipelineStats {
  totalOpportunities: number;
  totalPipelineValue: number;
  byStage: Array<{ stage: string; count: number; value: number }>;
  wonThisMonth: { count: number; value: number };
}

interface ClientOption {
  id: number;
  name: string;
  company?: string | null;
}

type StageDefinition = {
  id: string;
  description: string;
  color: string;
  dot: string;
} & ({ labelKey: string; label?: never } | { label: string; labelKey?: never });

const STAGE_DEFINITIONS: StageDefinition[] = [
  { id: "prospect", labelKey: "app.pipeline.lead", description: "Entrou no radar", color: "border-sky-400/40", dot: "bg-sky-400" },
  { id: "meeting", label: "Diagnóstico", description: "Reunião e briefing", color: "border-amber-400/40", dot: "bg-amber-400" },
  { id: "proposal", labelKey: "app.pipeline.proposal", description: "Escopo enviado", color: "border-violet-400/40", dot: "bg-violet-400" },
  { id: "negotiation", labelKey: "app.pipeline.negotiation", description: "Ajustes finais", color: "border-orange-400/50", dot: "bg-frame-orange" },
  { id: "paused", label: "Pausado", description: "Cliente em pausa", color: "border-gray-400/40", dot: "bg-gray-400" },
  { id: "won", labelKey: "app.pipeline.closedWon", description: "Virou projeto", color: "border-emerald-400/50", dot: "bg-emerald-400" },
  { id: "lost", labelKey: "app.pipeline.closedLost", description: "Encerrado", color: "border-red-400/45", dot: "bg-frame-red" },
];

interface PipelineStage {
  id: string;
  label: string;
  description: string;
  color: string;
  dot: string;
}

const getStages = (t: Translate): PipelineStage[] =>
  STAGE_DEFINITIONS.map((stage) => ({
    id: stage.id,
    description: stage.description,
    color: stage.color,
    dot: stage.dot,
    label: stage.labelKey !== undefined ? t(stage.labelKey) : stage.label,
  }));

const STAGE_ORDER = STAGE_DEFINITIONS.map((stage) => stage.id);

const emptyForm = {
  title: "",
  clientId: "",
  stage: "prospect",
  estimatedValue: "",
  probability: "35",
  expectedCloseDate: "",
  lostReason: "",
};

function PipelineContent() {
  const { t } = useLanguage();
  const stages = useMemo(() => getStages(t), [t]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "detail" | "delete" | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    void loadPipeline();
  }, []);

  const loadPipeline = async () => {
    setIsLoading(true);
    try {
      const [opportunitiesRes, statsRes, clientsRes] = await Promise.all([
        fetch("/api/pipeline-opportunities", { credentials: "include" }),
        fetch("/api/pipeline-stats", { credentials: "include" }),
        fetch("/api/clients", { credentials: "include" }),
      ]);

      const [opportunitiesData, statsData, clientsData] = await Promise.all([
        opportunitiesRes.json(),
        statsRes.json(),
        clientsRes.json(),
      ]);

      if (opportunitiesData.success) setOpportunities(opportunitiesData.data || []);
      if (statsData.success) setStats(statsData.data);
      if (clientsData.success) setClients(clientsData.data || []);
    } catch {
      toast.error(t("app.errors.generic") as string);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOpportunities = useMemo(() => {
    const term = search.trim().toLowerCase();
    return opportunities.filter((opp) => {
      const matchesStage = stageFilter === "all" || opp.stage === stageFilter;
      const matchesSearch =
        !term ||
        opp.title.toLowerCase().includes(term) ||
        opp.client_name?.toLowerCase().includes(term) ||
        opp.client_company?.toLowerCase().includes(term);
      return matchesStage && matchesSearch;
    });
  }, [opportunities, search, stageFilter]);

  const weightedValue = useMemo(
    () =>
      filteredOpportunities
        .filter((opp) => !["won", "lost"].includes(opp.stage))
        .reduce((sum, opp) => sum + ((opp.estimated_value || 0) * (opp.probability || 0)) / 100, 0),
    [filteredOpportunities],
  );

  const nextClosing = useMemo(() => {
    return filteredOpportunities
      .filter((opp) => opp.expected_close_date && !["won", "lost"].includes(opp.stage))
      .sort((a, b) => new Date(a.expected_close_date!).getTime() - new Date(b.expected_close_date!).getTime())[0];
  }, [filteredOpportunities]);

  const getOpportunitiesByStage = (stageId: string) =>
    filteredOpportunities.filter((opp) => opp.stage === stageId);

  const getStageTotal = (stageId: string) =>
    getOpportunitiesByStage(stageId).reduce((sum, opp) => sum + (opp.estimated_value || 0), 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

  const formatDate = (value?: string | null) => {
    if (!value) return t("app.common.noData") as string;
    return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
  };

  const getDueTone = (value?: string | null) => {
    if (!value) return "text-frame-gray-light";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(value);
    due.setHours(0, 0, 0, 0);
    const days = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (days < 0) return "text-frame-red";
    if (days <= 7) return "text-amber-300";
    return "text-frame-gray-light";
  };

  const resetForm = () => {
    setForm(emptyForm);
    setSelectedOpportunity(null);
  };

  const updateForm = (key: keyof typeof emptyForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const openCreateModal = () => {
    resetForm();
    setModalMode("create");
  };

  const openEditModal = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setForm({
      title: opportunity.title,
      clientId: (opportunity.client_id ?? opportunity.clientId ?? "").toString(),
      stage: opportunity.stage,
      estimatedValue: opportunity.estimated_value?.toString() || "",
      probability: opportunity.probability?.toString() || "35",
      expectedCloseDate: opportunity.expected_close_date || "",
      lostReason: opportunity.lost_reason || "",
    });
    setModalMode("edit");
  };

  const openDetailModal = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setModalMode("detail");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedOpportunity(null);
  };

  const submitOpportunity = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("Dê um nome para a oportunidade");
      return;
    }

    setIsSubmitting(true);
    try {
      const isEdit = modalMode === "edit" && selectedOpportunity;
      const response = await fetch(
        isEdit ? `/api/pipeline-opportunity?id=${selectedOpportunity.id}` : "/api/pipeline-opportunity",
        {
          method: isEdit ? "PUT" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title.trim(),
            clientId: form.clientId ? Number(form.clientId) : undefined,
            stage: form.stage,
            estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
            probability: Number(form.probability || 0),
            expectedCloseDate: form.expectedCloseDate || undefined,
            lostReason: form.stage === "lost" ? form.lostReason : undefined,
          }),
        },
      );
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Erro ao salvar oportunidade");

      toast.success(isEdit ? t("app.pipeline.opportunityUpdated") as string : t("app.pipeline.opportunityCreated") as string);
      closeModal();
      resetForm();
      await loadPipeline();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.errors.generic") as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveOpportunity = async (opportunity: Opportunity, targetStage: string) => {
    if (opportunity.stage === targetStage) return;
    try {
      const response = await fetch(`/api/pipeline-opportunity?id=${opportunity.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: targetStage }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Erro ao mover oportunidade");
      setOpportunities((current) =>
        current.map((item) => (item.id === opportunity.id ? { ...item, stage: targetStage } : item)),
      );
      void loadPipeline();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.errors.generic") as string);
    }
  };

  const deleteOpportunity = async () => {
    if (!selectedOpportunity) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/pipeline-opportunity?id=${selectedOpportunity.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Erro ao excluir oportunidade");
      toast.success(t("app.pipeline.opportunityDeleted") as string);
      closeModal();
      await loadPipeline();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("app.errors.generic") as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStage = (opportunity: Opportunity) => {
    const index = STAGE_ORDER.indexOf(opportunity.stage);
    return stages[index + 1];
  };

  const previousStage = (opportunity: Opportunity) => {
    const index = STAGE_ORDER.indexOf(opportunity.stage);
    return stages[index - 1];
  };

  const stageById = (id: string) => stages.find((stage) => stage.id === id) || stages[0];

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col overflow-x-hidden">
      <AppNavBar />

      <main id="main-content" className="flex-1 w-full px-4 md:px-6 py-6 space-y-5">
        <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 border-b border-frame-gray-3 pb-5">
          <div className="max-w-3xl min-w-0">
            <p className="frame-label mb-2">// {t("app.pipeline.title") as string}</p>
            <h1 className="frame-title text-[clamp(2rem,4vw,3.4rem)]">{t("app.pipeline.title") as string}</h1>
            <p className="text-frame-gray-light text-sm mt-2 max-w-2xl leading-relaxed">
              {t("app.pipeline.noOpportunitiesDesc") as string}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,360px)_190px_auto] gap-2 w-full xl:w-auto">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-frame-gray-1 border border-frame-gray-3 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-frame-orange"
                placeholder={t("app.common.search") as string}
              />
            </div>
            <div className="relative min-w-0">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
              <select
                value={stageFilter}
                onChange={(event) => setStageFilter(event.target.value)}
                className="w-full bg-frame-gray-1 border border-frame-gray-3 pl-9 pr-3 py-2.5 text-sm outline-none focus:border-frame-orange appearance-none"
              >
                <option value="all">{t("app.common.all") as string}</option>
                {stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={openCreateModal} className="frame-btn-primary flex items-center justify-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" />
              {t("app.pipeline.newOpportunity") as string}
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <Metric icon={DollarSign} label={t("app.pipeline.totalValue") as string} value={formatCurrency(stats?.totalPipelineValue || 0)} />
          <Metric icon={Target} label={t("app.pipeline.conversionRate") as string} value={formatCurrency(weightedValue)} />
          <Metric icon={TrendingUp} label={t("app.pipeline.closedWon") as string} value={formatCurrency(stats?.wonThisMonth.value || 0)} />
          <Metric
            icon={Clock}
            label={t("app.pipeline.expectedClose") as string}
            value={nextClosing ? formatDate(nextClosing.expected_close_date) : t("app.common.noData") as string}
          />
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin border-2 border-frame-gray-3 border-t-frame-orange" />
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 py-16">
            <EmptyState icon={Inbox} title={t("app.pipeline.noOpportunities") as string} />
          </div>
        ) : (
          <section className="flex gap-3 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageOpps = getOpportunitiesByStage(stage.id);
              return (
                <div key={stage.id} className={`w-[310px] shrink-0 border ${stage.color} bg-frame-gray-1/10`}>
                  <div className="p-3 border-b border-frame-gray-3 bg-frame-black/60">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 ${stage.dot}`} />
                        <h2 className="font-frame-mono uppercase tracking-[0.14em] text-xs">{stage.label}</h2>
                      </div>
                      <span className="text-[0.68rem] text-frame-gray-light">{stageOpps.length}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-xs text-frame-gray-light">{stage.description}</p>
                      <p className="text-xs text-frame-orange font-semibold">{formatCurrency(getStageTotal(stage.id))}</p>
                    </div>
                  </div>

                  <div className="p-2.5 space-y-2 min-h-[54vh]">
                    {stageOpps.map((opportunity) => (
                      <OpportunityCard
                        key={opportunity.id}
                        opportunity={opportunity}
                        formatCurrency={formatCurrency}
                        formatDate={formatDate}
                        dueTone={getDueTone(opportunity.expected_close_date)}
                        onOpen={() => openDetailModal(opportunity)}
                        onEdit={() => openEditModal(opportunity)}
                        onDelete={() => {
                          setSelectedOpportunity(opportunity);
                          setModalMode("delete");
                        }}
                        onMove={moveOpportunity}
                        previousStage={previousStage(opportunity)}
                        nextStage={nextStage(opportunity)}
                      />
                    ))}

                    {stageOpps.length === 0 && (
                      <button
                        onClick={openCreateModal}
                        className="w-full border border-dashed border-frame-gray-3 p-4 text-left text-xs text-frame-gray-light hover:border-frame-orange/60 hover:text-frame-orange transition"
                      >
                        {t("app.pipeline.newOpportunity") as string}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </main>

      <AnimatedModal
        isOpen={modalMode === "create" || modalMode === "edit"}
        onClose={closeModal}
        title={modalMode === "edit" ? t("app.pipeline.editOpportunity") as string : t("app.pipeline.newOpportunity") as string}
        description={t("app.pipeline.noOpportunitiesDesc") as string}
        className="max-w-3xl"
        footer={
          <>
            <button type="button" disabled={isSubmitting} onClick={closeModal} className="frame-btn-ghost">
              {t("app.common.cancel") as string}
            </button>
            <button
              type="submit"
              form="pipeline-form"
              disabled={isSubmitting || !form.title.trim()}
              className="frame-btn-primary"
            >
              {isSubmitting ? t("app.common.loading") as string : t("app.common.save") as string}
            </button>
          </>
        }
      >
        <PipelineForm
          form={form}
          clients={clients}
          isSubmitting={isSubmitting}
          updateForm={updateForm}
          onSubmit={submitOpportunity}
        />
      </AnimatedModal>

      <AnimatedModal
        isOpen={modalMode === "detail"}
        onClose={closeModal}
        title={t("app.pipeline.editOpportunity") as string}
        description={selectedOpportunity ? stageById(selectedOpportunity.stage).description : ""}
        className="max-w-3xl"
        footer={
          selectedOpportunity && (
            <>
              <button onClick={() => openEditModal(selectedOpportunity)} className="frame-btn-ghost">
                {t("app.common.edit") as string}
              </button>
              {previousStage(selectedOpportunity) && (
                <button
                  onClick={() => moveOpportunity(selectedOpportunity, previousStage(selectedOpportunity)!.id)}
                  className="frame-btn-ghost"
                >
                  {t("app.common.back") as string}
                </button>
              )}
              {nextStage(selectedOpportunity) && (
                <button
                  onClick={() => moveOpportunity(selectedOpportunity, nextStage(selectedOpportunity)!.id)}
                  className="frame-btn-primary"
                >
                  {t("app.common.next") as string}
                </button>
              )}
            </>
          )
        }
      >
        {selectedOpportunity && (
          <div className="space-y-5">
            <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="frame-label mb-2">{stageById(selectedOpportunity.stage).label}</p>
                  <h3 className="text-xl font-semibold">{selectedOpportunity.title}</h3>
                  <p className="text-sm text-frame-gray-light mt-1">
                    {selectedOpportunity.client_name || "Sem cliente vinculado"}
                    {selectedOpportunity.client_company ? ` / ${selectedOpportunity.client_company}` : ""}
                  </p>
                </div>
                <span className="text-frame-orange font-semibold">
                  {formatCurrency(selectedOpportunity.estimated_value || 0)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <DetailStat label={t("app.pipeline.probability") as string} value={`${selectedOpportunity.probability || 0}%`} />
              <DetailStat
                label={t("app.pipeline.conversionRate") as string}
                value={formatCurrency(((selectedOpportunity.estimated_value || 0) * (selectedOpportunity.probability || 0)) / 100)}
              />
              <DetailStat label={t("app.pipeline.expectedClose") as string} value={formatDate(selectedOpportunity.expected_close_date)} />
            </div>

            {selectedOpportunity.lost_reason && (
              <div className="border border-frame-red/30 bg-frame-red/5 p-4">
                <p className="frame-label text-frame-red mb-2">{t("app.pipeline.closedLost") as string}</p>
                <p className="text-sm text-frame-gray-light">{selectedOpportunity.lost_reason}</p>
              </div>
            )}
          </div>
        )}
      </AnimatedModal>

      <AnimatedModal
        isOpen={modalMode === "delete"}
        onClose={closeModal}
        title={t("app.common.delete") as string}
        description={t("app.studio.projectSelector.deleteDesc") as string}
        footer={
          <>
            <button type="button" disabled={isSubmitting} onClick={closeModal} className="frame-btn-ghost">
              {t("app.common.cancel") as string}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={deleteOpportunity}
              className="bg-frame-red hover:bg-red-600 text-white px-4 py-2 text-sm font-frame-mono uppercase tracking-wider transition"
            >
              {isSubmitting ? t("app.common.loading") as string : t("app.common.delete") as string}
            </button>
          </>
        }
      >
        <div className="border border-frame-red/30 bg-frame-red/5 p-4">
          <p className="font-semibold">{selectedOpportunity?.title}</p>
          <p className="text-sm text-frame-gray-light mt-1">{selectedOpportunity?.client_name || t("app.common.none") as string}</p>
        </div>
      </AnimatedModal>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="border border-frame-gray-3 bg-frame-gray-1/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="frame-label text-frame-gray-light">{label}</p>
          <p className="text-xl font-semibold mt-1">{value}</p>
        </div>
        <Icon className="w-5 h-5 text-frame-orange" />
      </div>
    </div>
  );
}

function OpportunityCard({
  opportunity,
  formatCurrency,
  formatDate,
  dueTone,
  onOpen,
  onEdit,
  onDelete,
  onMove,
  previousStage,
  nextStage,
}: {
  opportunity: Opportunity;
  formatCurrency: (value: number) => string;
  formatDate: (value?: string | null) => string;
  dueTone: string;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (opportunity: Opportunity, stage: string) => void;
  previousStage?: PipelineStage;
  nextStage?: PipelineStage;
}) {
  const { t } = useLanguage();
  const weighted = ((opportunity.estimated_value || 0) * (opportunity.probability || 0)) / 100;

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group border border-frame-gray-3 bg-frame-black/80 hover:border-frame-orange/50 transition"
    >
      <button onClick={onOpen} className="w-full text-left p-3 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold leading-snug">{opportunity.title}</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => event.stopPropagation()}
                className="p-1 text-frame-gray-light hover:text-frame-orange"
              >
                <MoreVertical className="w-4 h-4" />
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-frame-black border-frame-gray-3">
              <DropdownMenuItem onClick={onOpen} className="cursor-pointer">
                <Eye className="w-4 h-4 mr-2" />
                {t("app.common.preview") as string}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                <Edit className="w-4 h-4 mr-2" />
                {t("app.common.edit") as string}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-frame-red">
                <Trash2 className="w-4 h-4 mr-2" />
                {t("app.common.delete") as string}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 text-xs text-frame-gray-light">
          <Building2 className="w-3.5 h-3.5" />
          <span className="truncate">{opportunity.client_name || t("app.common.none") as string}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-2">
            <p className="text-frame-gray-light">{t("app.pipeline.value") as string}</p>
            <p className="font-semibold text-frame-orange mt-0.5">
              {formatCurrency(opportunity.estimated_value || 0)}
            </p>
          </div>
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-2">
            <p className="text-frame-gray-light">{t("app.pipeline.weighted") as string}</p>
            <p className="font-semibold mt-0.5">{formatCurrency(weighted)}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-[0.68rem] text-frame-gray-light mb-1">
            <span>{t("app.pipeline.probability") as string}</span>
            <span>{opportunity.probability || 0}%</span>
          </div>
          <div className="h-1.5 bg-frame-gray-3">
            <div className="h-full bg-frame-orange" style={{ width: `${Math.min(opportunity.probability || 0, 100)}%` }} />
          </div>
        </div>

        <div className={`flex items-center gap-2 text-xs ${dueTone}`}>
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatDate(opportunity.expected_close_date)}</span>
        </div>
      </button>

      <div className="grid grid-cols-2 border-t border-frame-gray-3">
        <button
          disabled={!previousStage}
          onClick={() => previousStage && onMove(opportunity, previousStage.id)}
          className="flex items-center justify-center gap-1.5 py-2 text-xs text-frame-gray-light hover:text-frame-white disabled:opacity-30 disabled:hover:text-frame-gray-light"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("app.common.back") as string}
        </button>
        <button
          disabled={!nextStage}
          onClick={() => nextStage && onMove(opportunity, nextStage.id)}
          className="flex items-center justify-center gap-1.5 py-2 text-xs text-frame-orange hover:bg-frame-orange/10 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          {t("app.common.next") as string}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.article>
  );
}

function PipelineForm({
  form,
  clients,
  isSubmitting,
  updateForm,
  onSubmit,
}: {
  form: typeof emptyForm;
  clients: ClientOption[];
  isSubmitting: boolean;
  updateForm: (key: keyof typeof emptyForm, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const { t } = useLanguage();
  const stages = useMemo(() => getStages(t), [t]);
  return (
    <form id="pipeline-form" onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.pipeline.opportunityTitle") as string} *</label>
        <input
          required
          disabled={isSubmitting}
          value={form.title}
          onChange={(event) => updateForm("title", event.target.value)}
          className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange"
          placeholder="Ex: Filme institucional / Retainer mensal"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.pipeline.clientName") as string}</label>
          <select
            disabled={isSubmitting}
            value={form.clientId}
            onChange={(event) => updateForm("clientId", event.target.value)}
            className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange"
          >
            <option value="">{t("app.common.none") as string}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company ? `${client.name} / ${client.company}` : client.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.pipeline.stage") as string}</label>
          <select
            disabled={isSubmitting}
            value={form.stage}
            onChange={(event) => updateForm("stage", event.target.value)}
            className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange"
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.pipeline.value") as string}</label>
          <input
            type="number"
            min="0"
            disabled={isSubmitting}
            value={form.estimatedValue}
            onChange={(event) => updateForm("estimatedValue", event.target.value)}
            className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange"
            placeholder="15000"
          />
        </div>

        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.pipeline.probability") as string}</label>
          <input
            type="number"
            min="0"
            max="100"
            disabled={isSubmitting}
            value={form.probability}
            onChange={(event) => updateForm("probability", event.target.value)}
            className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange"
          />
        </div>

        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-orange uppercase">{t("app.pipeline.expectedClose") as string}</label>
          <input
            type="date"
            disabled={isSubmitting}
            value={form.expectedCloseDate}
            onChange={(event) => updateForm("expectedCloseDate", event.target.value)}
            className="w-full bg-frame-gray-2 border border-frame-gray-3 px-3 py-2 text-sm outline-none focus:border-frame-orange"
          />
        </div>
      </div>

      {form.stage === "lost" && (
        <div className="space-y-2">
          <label className="block font-frame-mono text-xs text-frame-red uppercase">{t("app.pipeline.closedLost") as string}</label>
          <textarea
            disabled={isSubmitting}
            value={form.lostReason}
            onChange={(event) => updateForm("lostReason", event.target.value)}
            className="w-full h-24 bg-frame-gray-2 border border-frame-red/40 px-3 py-2 text-sm outline-none focus:border-frame-red resize-none"
            placeholder="Preço, timing, concorrência, escopo..."
          />
        </div>
      )}
    </form>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-3">
      <p className="frame-label text-frame-gray-light">{label}</p>
      <p className="text-sm font-semibold mt-1">{value}</p>
    </div>
  );
}

export default function Pipeline() {
  return (
    <ProtectedRoute>
      <PipelineContent />
    </ProtectedRoute>
  );
}
