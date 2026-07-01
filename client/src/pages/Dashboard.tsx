import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { api, type Client, type Project, type RecentActivity } from "@/lib/api";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Folder,
  Pin,
  Trash2,
  Plus,
  Compass,
  Activity,
  ChevronRight,
  Loader2,
  Clock,
  CalendarClock,
  Building2,
  Target,
  Sparkles,
  FileText,
  ListChecks,
  ArrowUpRight,
  KanbanSquare,
  WalletCards,
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

interface ProjectMetadata {
  isPinned?: boolean;
  projectType?: string;
  deadline?: string;
  objective?: string;
  workflowFocus?: string;
  creativeGoals?: {
    format?: string;
    client?: string;
    tone?: string;
    cameraModel?: string;
    budget?: string;
  };
}

const getMetadata = (p: Project): ProjectMetadata => {
  try {
    return JSON.parse(p.metadataJson || "{}");
  } catch {
    return {};
  }
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

function DashboardContent() {
  const [, setLocation] = useLocation();
  const { user, plan } = useAuth();
  const { t } = useLanguage();
  const {
    projects,
    isLoading: isProjectsLoading,
    createProject,
    updateProject,
    deleteProject,
    loadProjects,
  } = useProject();

  // Local States
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Form states for Create Project
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectType, setProjectType] = useState("Comercial");
  const [deadline, setDeadline] = useState("");
  const [objective, setObjective] = useState("");
  const [format, setFormat] = useState("");
  const [tone, setTone] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetCreateForm = () => {
    setName("");
    setDescription("");
    setClientId("");
    setProjectType("Comercial");
    setDeadline("");
    setObjective("");
    setFormat("");
    setTone("");
  };

  // Fetch recent activities on mount
  useEffect(() => {
    loadProjects();

    // Load clients for project creation
    api.clients.list().then((loadedClients) => {
      setClients(loadedClients);
      const query = new URLSearchParams(window.location.search);
      const requestedClientId = query.get("clientId");
      if (query.get("newProject") === "1" && requestedClientId && loadedClients.some((client) => String(client.id) === requestedClientId)) {
        setClientId(requestedClientId);
        setIsCreateOpen(true);
        window.history.replaceState({}, "", "/dashboard");
      }
    }).catch(() => setClients([]));

    api.projects
      .activity()
      .then((data) => setActivities(data || []))
      .catch(() => {})
      .finally(() => setIsActivitiesLoading(false));
  }, []);

  // Filter pinned & general projects
  const pinnedProjects = projects.filter((p) => getMetadata(p).isPinned);
  const generalProjects = projects.filter((p) => !getMetadata(p).isPinned);
  const activeProjects = projects.filter((p) => p.status === "active");
  const recentProject = projects[0];
  const pendingBriefings = projects.filter((p) => !getMetadata(p).objective && !getMetadata(p).creativeGoals?.format);
  const projectsWithoutDeadline = activeProjects.filter((p) => !getMetadata(p).deadline);
  const focusProject = pinnedProjects[0] || recentProject;
  const focusMeta = focusProject ? getMetadata(focusProject) : null;
  const focusClient = focusProject?.clientName || focusMeta?.creativeGoals?.client;
  const focusFormat = focusMeta?.creativeGoals?.format;
  const focusDeadline = focusMeta?.deadline;
  const focusStatus = !focusProject
    ? t("app.dashboard.statusEmpty")
    : !focusMeta?.objective && !focusFormat
      ? t("app.dashboard.statusBriefing")
      : focusProject.status === "completed"
        ? t("app.dashboard.statusDelivery")
        : t("app.dashboard.statusProduction");
  const focusNextAction = !focusProject
    ? t("app.dashboard.actionCreateProject")
    : !focusMeta?.objective && !focusFormat
      ? t("app.dashboard.actionCompleteBriefing")
      : !focusDeadline
        ? t("app.dashboard.actionDefineDeadline")
        : t("app.dashboard.actionOpenHub");
  const directorQueue = [
    ...pendingBriefings.slice(0, 2).map((project) => ({
      id: `briefing-${project.id}`,
      label: t("app.dashboard.queueBriefing"),
      detail: project.name,
      icon: FileText,
      tone: "text-frame-orange",
      action: () => setLocation(`/project/${project.id}/studio/07`),
    })),
    ...projectsWithoutDeadline.slice(0, 2).map((project) => ({
      id: `deadline-${project.id}`,
      label: t("app.dashboard.queueDeadline"),
      detail: project.name,
      icon: CalendarClock,
      tone: "text-amber-500",
      action: () => setLocation(`/project/${project.id}`),
    })),
    ...activities.slice(0, 2).map((activity) => ({
      id: `activity-${activity.id}`,
      label: t("app.dashboard.queueReviewOutput"),
      detail: activity.projectName || `${t("app.common.noData")} #${activity.toolId}`,
      icon: Sparkles,
      tone: "text-frame-orange",
      action: () => {
        if (activity.projectId) setLocation(`/project/${activity.projectId}/studio/${activity.toolId}`);
        else setLocation(`/studio/${activity.toolId}`);
      },
    })),
  ].slice(0, 5);

  const startProjectFromClient = () => {
    if (!clients.length) {
      toast.info("O fluxo começa no Comercial: cadastre um cliente antes de abrir o job.");
      setLocation("/clients/new");
      return;
    }

    resetCreateForm();
    setIsCreateOpen(true);
  };

  const operatingModules = [
    {
      id: "commercial",
      icon: Building2,
      eyebrow: "01 / COMERCIAL",
      title: "Comercial",
      description: "Cadastre o cliente, entenda a demanda e transforme a conversa em briefing, orçamento, proposta e contrato.",
      metric: String(clients.length),
      metricLabel: "clientes",
      route: clients.length ? "/clients" : "/clients/new",
      action: clients.length ? "Abrir Comercial" : "Cadastrar cliente",
      steps: ["Cliente", "Pipeline", "Briefing", "Proposta", "Contrato"],
    },
    {
      id: "projects",
      icon: KanbanSquare,
      eyebrow: "02 / PRODUÇÃO",
      title: "Produção",
      description: "Depois da venda, o job vira produção: roteiro, decupagem, callsheet, cronograma, arquivos, revisão e entrega.",
      metric: String(activeProjects.length),
      metricLabel: "jobs ativos",
      route: focusProject ? `/project/${focusProject.id}` : "/tools",
      action: focusProject ? "Abrir hub" : "Ver Studio IA",
      steps: ["Roteiro", "Decupagem", "Callsheet", "Cronograma", "Entrega"],
    },
    {
      id: "finance",
      icon: WalletCards,
      eyebrow: "03 / FINANCEIRO",
      title: "Financeiro",
      description: "Acompanhe o dinheiro do estúdio por cliente e por projeto: recebimentos, custos, recorrência e margem.",
      metric: String(activities.length),
      metricLabel: "movimentos recentes",
      route: "/analytics",
      action: "Abrir Financeiro",
      steps: ["Receitas", "Custos", "A receber", "Margem", "Forecast"],
    },
  ];

  const getActivityLabel = (act: RecentActivity) => {
    const projectLabel = act.projectName ? ` · ${act.projectName}` : "";
    if (act.toolId === "05") return `${t("app.dashboard.activityProposal")}${projectLabel}`;
    if (act.toolId === "07") return `${t("app.dashboard.activityBriefing")}${projectLabel}`;
    if (act.toolId === "03") return `${t("app.dashboard.activityCallsheet")}${projectLabel}`;
    return `${t("app.dashboard.activityGenerated")}${projectLabel}`;
  };

  // Toggle Pinned status in metadataJson
  const handleTogglePin = async (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const meta = getMetadata(p);
    const updatedMeta: ProjectMetadata = {
      ...meta,
      isPinned: !meta.isPinned,
    };

    try {
      await updateProject(p.id, {
        metadataJson: JSON.stringify(updatedMeta),
      });
      toast.success(
        updatedMeta.isPinned ? t("app.dashboard.projectUpdated") as string : t("app.dashboard.projectUpdated") as string,
      );
    } catch {
      toast.error(t("app.errors.generic") as string);
    }
  };

  // Open Studio inside Project
  const handleOpenProject = (projectId: number) => {
    setLocation(`/project/${projectId}`);
  };

  // Handle Create Project
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientId) {
      toast.error("Selecione o cliente antes de criar o projeto.");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedClient = clients.find((client) => String(client.id) === clientId);
      const metadata: ProjectMetadata = {
        projectType,
        deadline: deadline || undefined,
        objective: objective.trim() || undefined,
        workflowFocus: "briefing",
        creativeGoals: {
          format: format.trim() || undefined,
          client: selectedClient?.company || selectedClient?.name || undefined,
          tone: tone.trim() || undefined,
        },
      };
      const newProj = await createProject(
        name.trim(),
        description.trim() || undefined,
        clientId ? parseInt(clientId) : undefined,
        JSON.stringify(metadata),
      );
      setIsCreateOpen(false);
      resetCreateForm();
      toast.success(t("app.dashboard.projectCreated") as string);
      setLocation(`/project/${newProj.id}/studio/briefing`);
    } catch {
      // Toast handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    setIsSubmitting(true);
    try {
      await deleteProject(projectToDelete.id);
      setIsDeleteOpen(false);
      setProjectToDelete(null);
      toast.success(t("app.dashboard.projectDeleted") as string);
    } catch {
      // Toast handled by context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 md:py-16 space-y-12">
        {/* Cinematic Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-frame-gray-3 pb-6 gap-6">
          <div>
            <p className="frame-label mb-2">// {t("app.dashboard.title") as string}</p>
            <h1 className="frame-title text-[clamp(2.1rem,4vw,3.5rem)] text-frame-white leading-none">
              {t("app.dashboard.headingLead") as string}{" "}
              <em className="dashboard-title-outline not-italic">{t("app.dashboard.headingOutline") as string}</em>
            </h1>
            <p className="text-[0.82rem] text-frame-gray-light font-light mt-2 max-w-md">
              {t("app.dashboard.subtitle") as string}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="flex flex-wrap gap-3 shrink-0 font-frame-mono">
            <div className="px-4 py-3 border border-frame-gray-3 bg-frame-gray-1/30 min-w-[112px]">
              <span className="block text-[0.62rem] text-frame-gray-light tracking-widest uppercase mb-1">
                {t("app.dashboard.activeProjects") as string}
              </span>
              <span className="text-xl font-bold text-frame-white">{activeProjects.length}</span>
            </div>
            <div className="px-4 py-3 border border-frame-gray-3 bg-frame-gray-1/30 min-w-[112px]">
              <span className="block text-[0.62rem] text-frame-gray-light tracking-widest uppercase mb-1">
                {t("app.dashboard.pendingBriefings") as string}
              </span>
              <span className="text-xl font-bold text-frame-white">{pendingBriefings.length}</span>
            </div>
            <div className="px-4 py-3 border border-frame-gray-3 bg-frame-gray-1/30 min-w-[132px]">
              <span className="block text-[0.62rem] text-frame-gray-light tracking-widest uppercase mb-1">
                {t("app.profile.currentPlan") as string}
              </span>
              <span className="text-sm font-semibold text-frame-orange block truncate">
                {plan?.planName || "Free Plan"}
              </span>
            </div>
            <button
              onClick={startProjectFromClient}
              className="frame-btn-primary !py-3 !px-5 !text-[0.62rem] flex items-center justify-center gap-2 cursor-pointer h-full self-stretch"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("app.dashboard.newProject") as string}
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {operatingModules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                type="button"
                onClick={() => setLocation(module.route)}
                className="group min-h-[260px] border border-frame-gray-3 bg-frame-gray-1/20 p-5 text-left transition hover:border-frame-orange/60 hover:bg-frame-gray-1/35 sm:p-6"
              >
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div>
                    <p className="frame-label mb-2">// {module.eyebrow}</p>
                    <h2 className="frame-title text-[clamp(1.8rem,3vw,2.7rem)] leading-none text-frame-white group-hover:text-frame-orange">
                      {module.title}
                    </h2>
                  </div>
                  <Icon className="h-5 w-5 text-frame-orange" />
                </div>
                <p className="min-h-[64px] text-sm leading-relaxed text-frame-gray-light">{module.description}</p>
                <div className="mt-5 grid grid-cols-[96px_1fr] gap-4 border-y border-frame-gray-3 py-4">
                  <div>
                    <span className="block text-3xl font-bold leading-none text-frame-white">{module.metric}</span>
                    <span className="font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-gray-light">{module.metricLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {module.steps.map((step) => (
                      <span key={step} className="border border-frame-gray-3 px-2 py-1 font-frame-mono text-[0.56rem] uppercase tracking-[0.1em] text-frame-gray-light">
                        {step}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="mt-5 inline-flex items-center gap-2 font-frame-mono text-[0.62rem] uppercase tracking-[0.14em] text-frame-orange">
                  {module.action}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </button>
            );
          })}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)] gap-5">
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="frame-label mb-1">// {t("app.dashboard.focusLabel") as string}</p>
                <h2 className="frame-title text-[clamp(1.7rem,3vw,2.6rem)] leading-none text-frame-white">
                  {focusProject ? focusProject.name : t("app.dashboard.createFirstProject") as string}
                </h2>
              </div>
              <span className="font-frame-mono text-[0.62rem] tracking-[0.15em] uppercase text-frame-orange border border-frame-orange/30 px-2 py-1">
                {focusStatus as string}
              </span>
            </div>
            <p className="text-sm text-frame-gray-light leading-relaxed max-w-2xl mb-5">
              {focusProject
                ? focusProject.description || t("app.dashboard.focusDescriptionFallback") as string
                : t("app.dashboard.createFirstProjectDesc") as string}
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-5">
              <div className="border border-frame-gray-3 bg-frame-black/40 p-3">
                <span className="font-frame-mono text-[0.58rem] tracking-[0.14em] uppercase text-frame-gray-light">{t("app.dashboard.nextAction") as string}</span>
                <strong className="block text-sm text-frame-white mt-1 leading-tight">{focusNextAction as string}</strong>
              </div>
              <div className="border border-frame-gray-3 bg-frame-black/40 p-3">
                <span className="font-frame-mono text-[0.58rem] tracking-[0.14em] uppercase text-frame-gray-light">{t("app.dashboard.client") as string}</span>
                <strong className="block text-sm text-frame-white mt-1 truncate">{focusClient || t("app.common.noData") as string}</strong>
              </div>
              <div className="border border-frame-gray-3 bg-frame-black/40 p-3">
                <span className="font-frame-mono text-[0.58rem] tracking-[0.14em] uppercase text-frame-gray-light">{t("app.studio.metadataModal.format") as string}</span>
                <strong className="block text-sm text-frame-white mt-1 truncate">{focusFormat || t("app.common.noData") as string}</strong>
              </div>
              <div className="border border-frame-gray-3 bg-frame-black/40 p-3">
                <span className="font-frame-mono text-[0.58rem] tracking-[0.14em] uppercase text-frame-gray-light">{t("app.dashboard.deadline") as string}</span>
                <strong className="block text-sm text-frame-white mt-1">{formatDate(focusDeadline) || t("app.common.noData") as string}</strong>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  if (focusProject) {
                    setLocation(`/project/${focusProject.id}`);
                    return;
                  }
                  startProjectFromClient();
                }}
                className="frame-btn-primary !py-2.5 !px-4 !text-[0.6rem] flex items-center gap-2"
              >
                {focusProject ? t("app.dashboard.projectHub") as string : t("app.dashboard.createProject") as string}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              {focusProject && (
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${focusProject.id}/studio/07`)}
                  className="frame-btn-ghost !py-2.5 !px-4 !text-[0.6rem] flex items-center gap-2"
                >
                  {t("app.studio.timeline.briefing") as string}
                  <Target className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b border-frame-gray-3 pb-3 mb-4">
              <div>
                <p className="frame-label">// {t("app.dashboard.radarLabel") as string}</p>
                <h2 className="text-frame-white font-semibold tracking-tight mt-1">{t("app.dashboard.directorQueue") as string}</h2>
              </div>
              <ListChecks className="w-4 h-4 text-frame-orange shrink-0" />
            </div>
            {directorQueue.length ? (
              <div className="space-y-2">
                {directorQueue.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.action}
                      className="w-full group border border-frame-gray-3 bg-frame-black/40 hover:border-frame-orange/50 p-3 text-left transition flex items-center gap-3"
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${item.tone}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-frame-mono text-[0.58rem] tracking-[0.14em] uppercase text-frame-gray-light">{item.label as string}</span>
                        <strong className="block text-sm text-frame-white truncate group-hover:text-frame-orange">{item.detail}</strong>
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-frame-gray-light group-hover:text-frame-orange" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-frame-gray-3 p-5 text-sm text-frame-gray-light">
                {t("app.dashboard.queueEmpty") as string}
              </div>
            )}
          </div>
        </section>

        {/* Dashboard Grid Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Projects Core Column (Left) */}
          <div className="lg:col-span-2 space-y-10">
            {/* 1. PINNED PROJECTS */}
            {pinnedProjects.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-frame-gray-3 pb-2.5">
                  <Pin className="w-3.5 h-3.5 text-frame-orange rotate-45" />
                  <h3 className="font-frame-mono text-[0.68rem] tracking-[0.18em] uppercase text-frame-orange font-semibold">
                    {t("app.dashboard.pinned") as string}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {pinnedProjects.map((p) => {
                    const goals = getMetadata(p).creativeGoals;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleOpenProject(p.id)}
                        className="group border border-frame-orange/20 bg-frame-orange/[0.02] p-5 hover:border-frame-orange hover:bg-frame-orange/[0.04] transition duration-300 relative cursor-pointer flex flex-col justify-between min-h-[155px]"
                      >
                        <button
                          onClick={(e) => handleTogglePin(p, e)}
                          className="absolute top-4 right-4 text-frame-orange hover:text-frame-white transition-colors cursor-pointer"
                          title={t("app.dashboard.unpin") as string}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>

                        <div className="space-y-2 pr-6">
                          <span className="font-frame-mono text-[0.62rem] tracking-wider text-frame-gray-light block">
                            ID: #{p.id}
                          </span>
                          <h4 className="frame-title text-[1.4rem] text-frame-white group-hover:text-frame-orange transition-colors">
                            {p.name}
                          </h4>
                          <p className="text-[0.76rem] leading-relaxed text-frame-gray-light line-clamp-2 font-light">
                            {p.description || t("app.common.noData") as string}
                          </p>
                          {p.clientName && (
                            <p className="inline-flex items-center gap-1.5 font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-orange">
                              <Building2 className="h-3 w-3" />
                              {p.clientName}
                            </p>
                          )}
                        </div>

                        {/* Metas display (format / tone) */}
                        {goals && (goals.format || goals.tone) && (
                          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-frame-gray-3/40 mt-3 font-frame-mono">
                            {goals.format && (
                              <span className="text-[0.62rem] tracking-wider text-frame-orange bg-frame-orange/[0.08] px-2 py-0.5 border border-frame-orange/10">
                                {goals.format}
                              </span>
                            )}
                            {goals.tone && (
                              <span className="text-[0.62rem] tracking-wider text-frame-white bg-frame-gray-2 px-2 py-0.5 border border-frame-gray-3">
                                {goals.tone}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. ALL PROJECTS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-frame-gray-3 pb-2.5">
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-frame-gray-light" />
                  <h3 className="font-frame-mono text-[0.68rem] tracking-[0.18em] uppercase text-frame-white font-semibold">
                    {t("app.common.all") as string}
                  </h3>
                </div>
                <span className="font-frame-mono text-[0.64rem] text-frame-gray-light">
                  Total: {projects.length}
                </span>
              </div>

              {isProjectsLoading && projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-frame-gray-3">
                  <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
                  <p className="font-frame-mono text-[0.62rem] tracking-widest text-frame-gray-light uppercase">
                    {t("app.dashboard.loadingProjects") as string}
                  </p>
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-frame-gray-3 space-y-4">
                  <p className="text-sm text-frame-gray-light font-light max-w-sm">
                    {t("app.dashboard.createFirstProjectDesc") as string}
                  </p>
                  <button
                    onClick={startProjectFromClient}
                    className="frame-btn-ghost !py-2 !px-4 !text-[0.62rem] flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> {t("app.dashboard.createFirstProject") as string}
                  </button>
                </div>
              ) : (
                <div className="border border-frame-gray-3 bg-frame-gray-1/10 divide-y divide-frame-gray-3 font-frame-body">
                  {generalProjects.map((p) => {
                    const goals = getMetadata(p).creativeGoals;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleOpenProject(p.id)}
                        className="p-4 flex items-center justify-between gap-4 hover:bg-frame-gray-1/30 transition duration-150 cursor-pointer group"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-[0.88rem] font-semibold text-frame-white group-hover:text-frame-orange transition-colors truncate">
                              {p.name}
                            </h4>
                            {goals?.format && (
                              <span className="font-frame-mono text-[0.62rem] text-frame-gray-light bg-frame-gray-2 px-1.5 py-0.5 border border-frame-gray-3">
                                {goals.format}
                              </span>
                            )}
                          </div>
                          <p className="text-[0.76rem] text-frame-gray-light line-clamp-1 font-light max-w-xl">
                            {p.description || t("app.common.noData") as string}
                          </p>
                          {p.clientName && (
                            <p className="flex items-center gap-1.5 font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-orange">
                              <Building2 className="h-3 w-3" />
                              {p.clientName}
                            </p>
                          )}
                        </div>

                        {/* Actions block */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => handleTogglePin(p, e)}
                            className="p-2 text-frame-gray-light hover:text-frame-orange hover:bg-frame-gray-2 transition rounded-none cursor-pointer outline-none"
                            title={t("app.dashboard.pinned") as string}
                          >
                            <Pin className="w-3.5 h-3.5 rotate-45" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setProjectToDelete(p);
                              setIsDeleteOpen(true);
                            }}
                            className="p-2 text-frame-gray-light hover:text-frame-red hover:bg-frame-gray-2 transition rounded-none cursor-pointer outline-none"
                            title={t("app.dashboard.deleteProject") as string}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-frame-gray-muted group-hover:text-frame-orange group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Activity Column (Right) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-frame-gray-3 pb-2.5">
              <Activity className="w-3.5 h-3.5 text-frame-orange" />
              <h3 className="font-frame-mono text-[0.68rem] tracking-[0.18em] uppercase text-frame-white font-semibold">
                {t("app.dashboard.recentActivities") as string}
              </h3>
            </div>

            {isActivitiesLoading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 border border-frame-gray-3/40 bg-frame-gray-1/10 min-h-[200px]">
                <Loader2 className="w-4 h-4 animate-spin text-frame-orange" />
                <span className="font-frame-mono text-[0.62rem] text-frame-gray-light tracking-wider">
                  {t("app.common.loading") as string}
                </span>
              </div>
            ) : activities.length === 0 ? (
              <div className="p-6 text-center border border-frame-gray-3/40 bg-frame-gray-1/10 font-frame-body text-xs text-frame-gray-light italic">
                {t("app.dashboard.noActivities") as string}
              </div>
            ) : (
              <div className="border border-frame-gray-3/40 bg-frame-gray-1/10 p-4 space-y-4 max-h-[480px] overflow-y-auto">
                {activities.map((act) => {
                  const dateStr = new Date(act.createdAt).toLocaleDateString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={act.id}
                      onClick={() => {
                        if (act.projectId) {
                          setLocation(`/project/${act.projectId}/studio/${act.toolId}`);
                        } else {
                          setLocation(`/studio/${act.toolId}`);
                        }
                      }}
                      className="group border border-[#1a1a1a] hover:border-frame-orange/30 bg-frame-black p-3 transition duration-150 cursor-pointer flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-frame-mono text-[0.64rem] text-frame-orange tracking-wider uppercase font-semibold">
                          {act.toolId}
                        </span>
                        <div className="flex items-center gap-1 text-frame-gray-light text-[0.62rem] font-frame-mono shrink-0">
                          <Clock className="w-2.5 h-2.5" />
                          {dateStr}
                        </div>
                      </div>

                      <p className="text-[0.76rem] font-medium text-frame-white leading-normal group-hover:text-frame-orange transition-colors">
                        {getActivityLabel(act)}
                      </p>

                      {act.projectName && (
                        <div className="flex items-center justify-between gap-2 font-frame-mono text-[0.62rem] text-frame-gray-light mt-1 pt-1.5 border-t border-frame-gray-3/40">
                          <span className="flex items-center gap-1 min-w-0">
                            <Folder className="w-2.5 h-2.5 text-frame-orange shrink-0" />
                            <span className="truncate">{act.projectName}</span>
                          </span>
                          <span className="text-frame-orange uppercase tracking-[0.12em] shrink-0">{t("app.common.open") as string}</span>
                        </div>
                      )}

                      {!act.projectName && (
                        <div className="flex items-center justify-end font-frame-mono text-[0.62rem] text-frame-orange mt-1 pt-1.5 border-t border-frame-gray-3/40 uppercase tracking-[0.12em]">
                          {t("app.common.open") as string}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Actions Panel */}
            <div className="border border-frame-gray-3/40 bg-frame-gray-1/10 p-4 space-y-3 font-frame-mono text-[0.64rem]">
              <span className="block tracking-wider uppercase text-frame-gray-light font-bold">
                // {t("app.common.filter") as string}
              </span>
              <button
                onClick={() => setLocation("/tools")}
                className="w-full flex items-center justify-between p-2.5 border border-frame-gray-3 bg-frame-black hover:border-frame-orange/40 hover:text-frame-orange transition text-left cursor-pointer rounded-none"
              >
                <span className="flex items-center gap-2 font-medium tracking-wide">
                  <Compass className="w-3.5 h-3.5 text-frame-orange" />
                  {t("app.tools.allTools") as string}
                </span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-2xl rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="font-frame-display text-2xl tracking-wider text-frame-white">
              {t("app.studio.projectSelector.createTitle") as string}
            </DialogTitle>
            <DialogDescription className="font-frame-body text-xs text-frame-gray-light">
              {t("app.studio.projectSelector.createDesc") as string}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                {t("app.studio.projectSelector.projectName") as string}
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                placeholder={t("app.studio.projectSelector.projectNamePlaceholder") as string}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#111] border border-frame-gray-3 text-frame-white p-2.5 font-frame-body text-[0.83rem] outline-none transition focus:border-frame-orange rounded-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                {t("app.studio.projectSelector.projectDesc") as string}
              </label>
              <textarea
                placeholder={t("app.studio.projectSelector.projectDescPlaceholder") as string}
                disabled={isSubmitting}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-[#111] border border-frame-gray-3 text-frame-white p-2.5 font-frame-body text-[0.83rem] outline-none transition resize-none h-[75px] focus:border-frame-orange rounded-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                  {t("app.dashboard.projectType") as string}
                </label>
                <select
                  disabled={isSubmitting}
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full bg-[#111] border border-frame-gray-3 text-frame-white px-3 py-2.5 font-frame-body text-[0.83rem] outline-none transition focus:border-frame-orange rounded-none appearance-none cursor-pointer"
                >
                  <option value="Comercial">{t("app.dashboard.typeCommercial") as string}</option>
                  <option value="Institucional">{t("app.dashboard.typeInstitutional") as string}</option>
                  <option value="Videoclipe">{t("app.dashboard.typeMusicVideo") as string}</option>
                  <option value="Social media">{t("app.dashboard.typeSocialMedia") as string}</option>
                  <option value="Documentário">{t("app.dashboard.typeDocumentary") as string}</option>
                  <option value="Evento">{t("app.dashboard.typeEvent") as string}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                  {t("app.dashboard.deadline") as string}
                </label>
                <input
                  type="date"
                  disabled={isSubmitting}
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full bg-[#111] border border-frame-gray-3 text-frame-white px-3 py-2.5 font-frame-body text-[0.83rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                  {t("app.studio.metadataModal.format") as string}
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="ex: filme 30s, reels, case, teaser"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-[#111] border border-frame-gray-3 text-frame-white p-2.5 font-frame-body text-[0.83rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                  {t("app.studio.metadataModal.tone") as string}
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="ex: elegante, energético, documental"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-[#111] border border-frame-gray-3 text-frame-white p-2.5 font-frame-body text-[0.83rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                {t("app.dashboard.objective") as string}
              </label>
              <textarea
                placeholder="O que esse projeto precisa resolver para o cliente?"
                disabled={isSubmitting}
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="w-full bg-[#111] border border-frame-gray-3 text-frame-white p-2.5 font-frame-body text-[0.83rem] outline-none transition resize-none h-[70px] focus:border-frame-orange rounded-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                {t("app.dashboard.client") as string} *
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-frame-gray-light" />
                <select
                  disabled={isSubmitting}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-[#111] border border-frame-gray-3 text-frame-white pl-10 pr-4 py-2.5 font-frame-body text-[0.83rem] outline-none transition focus:border-frame-orange rounded-none appearance-none cursor-pointer"
                >
                  <option value="">Selecione um cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.company ? `${client.name} (${client.company})` : client.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#1a1a1a]">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCreateOpen(false)}
                className="frame-btn-ghost !py-2 !px-4 !text-[0.62rem]"
              >
                {t("app.common.cancel") as string}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim() || !clientId}
                className="frame-btn-primary !py-2 !px-4 !text-[0.62rem] flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t("app.studio.projectSelector.creating") as string}
                  </>
                ) : (
                  t("app.dashboard.createProject") as string
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE MODAL */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-sm rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="font-frame-display text-2xl tracking-wider text-frame-red">
              {t("app.studio.projectSelector.deleteTitle") as string}
            </DialogTitle>
            <DialogDescription className="font-frame-body text-xs text-frame-gray-light leading-relaxed">
              {t("app.studio.projectSelector.deleteDesc") as string}{" "}
              <strong className="text-frame-white">"{projectToDelete?.name}"</strong>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-[#1a1a1a]">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsDeleteOpen(false)}
              className="frame-btn-ghost !py-2 !px-4 !text-[0.62rem]"
            >
              {t("app.common.cancel") as string}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteConfirm}
              className="font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase font-semibold text-frame-white bg-frame-red hover:bg-[#d82a2a] py-2 px-4 transition duration-150 rounded-none cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("app.studio.projectSelector.excluding") as string}
                </>
              ) : (
                t("app.studio.projectSelector.exclude") as string
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
