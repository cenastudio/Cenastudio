import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { api, type Client, type Project, type RecentActivity } from "@/lib/api";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import ConfirmDialog from "@/components/ConfirmDialog";
import WelcomeModal from "@/components/onboarding/WelcomeModal";
import ProductTour from "@/components/onboarding/ProductTour";
import {
  Plus,
  ChevronRight,
  Loader2,
  Clock,
  CalendarClock,
  Building2,
  Sparkles,
  FileText,
  ListChecks,
  ArrowUpRight,
  Users,
  FileSignature,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { getStageForTool, getWorkflowStage } from "@/lib/workflow";
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
  workflowStage?: string;
  creativeGoals?: {
    format?: string;
    client?: string;
    tone?: string;
    cameraModel?: string;
    budget?: string;
  };
}

export const getMetadata = (p: Project): ProjectMetadata => {
  try {
    return JSON.parse(p.metadataJson || "{}");
  } catch {
    return {};
  }
};

const formatDate = (value?: string, locale = "pt-BR") => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(locale, { day: "2-digit", month: "short" });
};

function getGreeting(locale = "pt"): string {
  const hour = new Date().getHours();
  if (locale === "en") {
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 18) return "Good afternoon";
    return "Good evening";
  }
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function DashboardContent() {
  const [, setLocation] = useLocation();
  const { user, plan, isTeamMember, teamContext } = useAuth();
  const { t, locale } = useLanguage();
  const {
    projects,
    isLoading: isProjectsLoading,
    createProject,
    deleteProject,
    loadProjects,
  } = useProject();

  // Local States
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Onboarding States
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);

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

  useEffect(() => {
    loadProjects();

    const hasSeenWelcome = localStorage.getItem("cena-studio-welcome-completed");
    const hasSkippedWelcome = localStorage.getItem("cena-studio-welcome-dismissed");

    if (!hasSeenWelcome && !hasSkippedWelcome) {
      setTimeout(() => setIsWelcomeOpen(true), 500);
    }

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

  // Derived data — team members only see assigned projects
  const visibleProjects = isTeamMember
    ? projects // ProjectContext already scopes to the owner's data; we filter by membership
    : projects;
  const activeProjects = visibleProjects.filter((p) => p.status === "active");
  const pinnedProjects = visibleProjects.filter((p) => getMetadata(p).isPinned);
  const recentProject = visibleProjects[0];
  const pendingBriefings = visibleProjects.filter((p) => !getMetadata(p).objective && !getMetadata(p).creativeGoals?.format);
  const projectsWithoutDeadline = activeProjects.filter((p) => !getMetadata(p).deadline);

  // Focus project
  const focusProject = pinnedProjects[0] || recentProject;
  const focusMeta = focusProject ? getMetadata(focusProject) : null;
  const focusClient = focusProject?.clientName || focusMeta?.creativeGoals?.client;
  const focusFormat = focusMeta?.creativeGoals?.format;
  const focusDeadline = focusMeta?.deadline;
  const focusStage = getWorkflowStage(focusMeta?.workflowStage || getStageForTool(focusMeta?.workflowFocus));

  const focusActionRoute = focusProject
    ? !focusMeta?.objective && !focusFormat
      ? `/project/${focusProject.id}/studio/briefing`
      : !focusDeadline
        ? `/project/${focusProject.id}`
        : `/project/${focusProject.id}/journey/${focusStage.id}`
    : null;

  const focusActionLabel = focusProject
    ? !focusMeta?.objective && !focusFormat
      ? (locale === "en" ? "Complete briefing" : "Completar briefing")
      : !focusDeadline
        ? (locale === "en" ? "Set deadline" : "Definir prazo")
        : (locale === "en" ? "Continue job" : "Continuar job")
    : (locale === "en" ? "Start first job" : "Iniciar primeiro job");

  // Director Queue (pendências)
  const directorQueue = [
    ...pendingBriefings.slice(0, 3).map((project) => ({
      id: `briefing-${project.id}`,
      label: locale === "en" ? "Complete briefing" : "Completar briefing",
      detail: project.name,
      icon: FileText,
      tone: "text-frame-orange",
      action: () => setLocation(`/project/${project.id}/studio/briefing`),
    })),
    ...projectsWithoutDeadline.slice(0, 2).map((project) => ({
      id: `deadline-${project.id}`,
      label: locale === "en" ? "Set deadline" : "Definir prazo",
      detail: project.name,
      icon: CalendarClock,
      tone: "text-amber-500",
      action: () => setLocation(`/project/${project.id}`),
    })),
    ...activities.slice(0, 2).map((activity) => ({
      id: `activity-${activity.id}`,
      label: "Nova geração pronta",
      detail: activity.projectName || `Geração #${activity.toolId}`,
      icon: Sparkles,
      tone: "text-frame-orange",
      action: () => {
        if (activity.projectId) setLocation(`/project/${activity.projectId}/studio/${activity.toolId}`);
        else setLocation(`/studio/${activity.toolId}`);
      },
    })),
  ].slice(0, 5);

  // Summary line
  const nextStep = focusProject
    ? !focusMeta?.objective && !focusFormat
      ? "Briefing"
      : !focusDeadline
        ? (locale === "en" ? "Set deadline" : "Definir prazo")
        : (locale === "en" ? (focusStage.labelEn ?? focusStage.label) : focusStage.label)
    : null;
  const deadlineStr = focusDeadline ? formatDate(focusDeadline, locale === "en" ? "en-US" : "pt-BR") : null;
  const summaryParts = [
    locale === "en"
      ? `${activeProjects.length} active job${activeProjects.length !== 1 ? "s" : ""}`
      : `${activeProjects.length} job${activeProjects.length !== 1 ? "s" : ""} ativo${activeProjects.length !== 1 ? "s" : ""}`,
    nextStep ? `${locale === "en" ? "next" : "próximo"}: ${nextStep}` : null,
    deadlineStr ? `${locale === "en" ? "due" : "prazo"}: ${deadlineStr}` : null,
  ].filter(Boolean);

  const startProjectFromClient = () => {
    if (!clients.length) {
      toast.info(locale === "en"
        ? "The flow starts in Commercial: register a client before opening a job."
        : "O fluxo começa no Comercial: cadastre um cliente antes de abrir o job.");
      setLocation("/clients/new");
      return;
    }
    resetCreateForm();
    setIsCreateOpen(true);
  };

  const handleStartTour = () => {
    setIsWelcomeOpen(false);
    setTimeout(() => setIsTourOpen(true), 300);
  };

  const handleTourComplete = () => {
    setIsTourOpen(false);
    setTimeout(() => setIsWelcomeOpen(true), 300);
  };

  const handleWelcomeComplete = () => {
    setIsWelcomeOpen(false);
    toast.success(locale === "en" ? "Welcome to Cena Studio! 🎬" : "Bem-vindo ao Cena Studio! 🎬");
  };

  const getActivityLabel = (act: RecentActivity) => {
    const projectLabel = act.projectName ? ` · ${act.projectName}` : "";
    if (locale === "en") {
      if (act.toolId === "05") return `New proposal${projectLabel}`;
      if (act.toolId === "07") return `New briefing${projectLabel}`;
      if (act.toolId === "03") return `New callsheet${projectLabel}`;
      return `New generation${projectLabel}`;
    }
    if (act.toolId === "05") return `Nova proposta${projectLabel}`;
    if (act.toolId === "07") return `Novo briefing${projectLabel}`;
    if (act.toolId === "03") return `Novo callsheet${projectLabel}`;
    return `Nova geração${projectLabel}`;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !clientId) {
      toast.error(locale === "en" ? "Select a client before creating the project." : "Selecione o cliente antes de criar o projeto.");
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
        workflowStage: "entry",
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

  const firstName = user?.name?.split(" ")[0] || "Diretor";

  return (
    <div className="min-h-screen bg-frame-black text-frame-white font-frame-body flex flex-col">
      <AppNavBar />

      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 md:py-14 space-y-8">

        {/* ─── HERO: SAUDAÇÃO + STATS ─── */}
        <header className="pb-6 border-b border-frame-gray-3/50">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="font-frame-mono text-[0.56rem] uppercase tracking-[0.22em] text-frame-orange mb-2">{locale === "en" ? "// Operations panel" : "// Painel de operação"}</p>
              <h1 className="frame-title text-[clamp(2rem,4vw,3rem)] text-frame-white leading-tight">
                {getGreeting(locale)}, <span className="text-frame-orange">{firstName}</span>.
              </h1>
              <p className="font-frame-mono text-[0.7rem] text-frame-gray-light tracking-[0.04em] mt-2">
                {isTeamMember ? `Membro ${teamContext?.role || "da equipe"} · ${summaryParts.join(" · ")}` : summaryParts.join(" · ")}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap shrink-0">
              <div className="glow-card px-4 py-2.5 text-center min-w-[72px]">
                <span className="block text-2xl font-bold text-frame-white leading-none">{activeProjects.length}</span>
                <span className="block font-frame-mono text-[0.52rem] uppercase tracking-wider text-frame-orange mt-1">Jobs</span>
              </div>
              <div className="glow-card px-4 py-2.5 text-center min-w-[72px]">
                <span className="block text-2xl font-bold text-frame-white leading-none">{directorQueue.length}</span>
                <span className="block font-frame-mono text-[0.52rem] uppercase tracking-wider text-frame-gray-light mt-1">{locale === "en" ? "Pending" : "Pendente"}</span>
              </div>
              <div className="glow-card px-4 py-2.5 text-center min-w-[72px]">
                <span className="block text-2xl font-bold text-frame-white leading-none">{activities.length}</span>
                <span className="block font-frame-mono text-[0.52rem] uppercase tracking-wider text-frame-gray-light mt-1">{locale === "en" ? "Actions" : "Ações"}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ─── JOB EM FOCO ─── */}
        {focusProject && (
          <section
            className="relative overflow-hidden animate-stagger-1"
            style={{
              background: "linear-gradient(135deg, rgba(232,80,2,0.10) 0%, rgba(232,80,2,0.03) 60%, transparent 100%)",
              border: "1px solid rgba(232,80,2,0.25)",
              borderLeft: "3px solid #e85002",
            }}
          >
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-[0.06]"
              style={{ background: "radial-gradient(circle, #e85002 0%, transparent 70%)" }}
            />
            <div className="relative p-5 sm:p-7">
              <p className="font-frame-mono text-[0.56rem] uppercase tracking-[0.22em] text-frame-orange mb-4">⚡ {locale === "en" ? "Focus job" : "Job em foco"}</p>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="space-y-3 min-w-0 flex-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-frame-white leading-tight">{focusProject.name}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {focusFormat && (
                      <span className="font-frame-mono text-[0.6rem] px-2 py-0.5 border border-frame-orange/25 bg-frame-orange/[0.07] text-frame-orange">{focusFormat}</span>
                    )}
                    {focusClient && (
                      <span className="font-frame-mono text-[0.6rem] px-2 py-0.5 border border-frame-gray-3 bg-frame-gray-2/30 text-frame-gray-light flex items-center gap-1">
                        <Building2 className="w-2.5 h-2.5" />{focusClient}
                      </span>
                    )}
                    {focusDeadline && (
                      <span className="font-frame-mono text-[0.6rem] px-2 py-0.5 border border-frame-gray-3 bg-frame-gray-2/30 text-frame-gray-light flex items-center gap-1">
                        <CalendarClock className="w-2.5 h-2.5" />{formatDate(focusDeadline)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-frame-mono text-[0.58rem] text-frame-gray-light uppercase">{locale === "en" ? "Stage:" : "Etapa:"}</span>
                    <span className="font-frame-mono text-[0.58rem] text-frame-white font-semibold">{locale === "en" ? (focusStage.labelEn ?? focusStage.label) : focusStage.label}</span>
                    <div className="flex-1 max-w-[100px] h-1 bg-frame-gray-2 rounded-full overflow-hidden">
                      <div className="h-full bg-frame-orange rounded-full" style={{ width: `${Math.max(10, (focusStage.order ?? 1) * 14)}%` }} />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => focusActionRoute ? setLocation(focusActionRoute) : startProjectFromClient()}
                  className="frame-btn-primary flex items-center gap-2 shrink-0 whitespace-nowrap px-6 py-3"
                >
                  {focusActionLabel} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ─── PENDÊNCIAS (Director Queue) ─── */}
        {/* ─── PENDÊNCIAS + ATALHOS em 2 colunas ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 animate-stagger-2">

          {/* Pendências */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-frame-orange" />
                <h2 className="font-frame-mono text-[0.7rem] uppercase tracking-[0.16em] text-frame-white font-semibold">{locale === "en" ? "Pending" : "Pendências"}</h2>
              </div>
              <span className="font-frame-mono text-[0.6rem] text-frame-gray-light border border-frame-gray-3 px-2 py-0.5">
                {directorQueue.length} item{directorQueue.length !== 1 ? "s" : ""}
              </span>
            </div>
            {directorQueue.length > 0 ? (
              <div className="space-y-2">
                {directorQueue.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.id} type="button" onClick={item.action}
                      className="w-full group glow-card p-3.5 text-left flex items-center gap-3">
                      <div className="w-7 h-7 flex items-center justify-center border border-frame-gray-3 bg-frame-gray-2/30 shrink-0">
                        <Icon className={`w-3.5 h-3.5 ${item.tone}`} />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block font-frame-mono text-[0.54rem] tracking-[0.14em] uppercase text-frame-gray-light mb-0.5">{item.label}</span>
                        <strong className="block text-[0.82rem] text-frame-white truncate group-hover:text-frame-orange transition-colors">{item.detail}</strong>
                      </span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-frame-gray-light group-hover:text-frame-orange transition-colors shrink-0" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="frame-empty-state p-5 flex items-center gap-3">
                <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-frame-green/10 border border-frame-green/30">
                  <span className="text-sm">✓</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-frame-white">{locale === "en" ? "All up to date" : "Tudo em dia"}</p>
                  <p className="text-[0.66rem] text-frame-gray-light mt-0.5">{locale === "en" ? "Incomplete briefings, deadlines and reviews appear here." : "Briefings incompletos, prazos e revisões aparecem aqui."}</p>
                </div>
              </div>
            )}
          </section>

          {/* Atalhos */}
          <section className="space-y-3">
            <h2 className="font-frame-mono text-[0.7rem] uppercase tracking-[0.16em] text-frame-white font-semibold">{locale === "en" ? "Shortcuts" : "Atalhos"}</h2>
            <div className="space-y-2">
              {[
                { icon: Plus, label: locale === "en" ? "New Job" : "Novo Job", sub: locale === "en" ? "Create project" : "Criar projeto", action: startProjectFromClient },
                { icon: Users, label: locale === "en" ? "New Client" : "Novo Cliente", sub: locale === "en" ? "Register" : "Cadastrar", action: () => setLocation("/clients/new") },
                { icon: FileSignature, label: locale === "en" ? "New Proposal" : "Nova Proposta", sub: locale === "en" ? "Quote" : "Orçamento", action: () => setLocation("/proposals") },
              ].map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <button key={shortcut.label} type="button" onClick={shortcut.action}
                    className="group w-full glow-card p-3.5 text-left flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] group-hover:bg-frame-orange group-hover:border-frame-orange transition-all rounded shrink-0">
                      <Icon className="w-4 h-4 text-frame-orange group-hover:text-frame-black transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[0.84rem] font-semibold text-frame-white group-hover:text-frame-orange transition-colors">{shortcut.label}</span>
                      <span className="block font-frame-mono text-[0.58rem] text-frame-gray-light">{shortcut.sub}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-frame-gray-light group-hover:text-frame-orange transition-colors shrink-0" />
                  </button>
                );
              })}
            </div>
          </section>
        </div>

        {/* ─── ATIVIDADES RECENTES ─── */}
        <section className="space-y-3 animate-stagger-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-frame-orange" />
            <h2 className="font-frame-mono text-[0.7rem] uppercase tracking-[0.16em] text-frame-white font-semibold">{locale === "en" ? "Recent activity" : "Atividades recentes"}</h2>
          </div>

          {isActivitiesLoading ? (
            <div className="liquid-glass p-6 text-center">
              <p className="text-sm text-frame-gray-light animate-pulse">Carregando...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="frame-empty-state p-5 flex items-start gap-3">
              <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full bg-frame-orange/10 border border-frame-orange/25">
                <Activity className="w-3.5 h-3.5 text-frame-orange" />
              </div>
              <div>
                <p className="text-sm font-semibold text-frame-white">{locale === "en" ? "No activity yet" : "Nenhuma atividade ainda"}</p>
                <p className="text-[0.66rem] text-frame-gray-light mt-0.5">{locale === "en" ? "Appears when you use AI tools, create projects or upload files." : "Aparece quando você usar ferramentas de IA, criar projetos ou subir arquivos."}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(locale === "en"
                    ? ["Generate script", "Create briefing", "Upload file", "Video review"]
                    : ["Gerar roteiro", "Criar briefing", "Subir arquivo", "Review de vídeo"]
                  ).map((ex) => (
                    <span key={ex} className="text-[0.58rem] font-mono border border-frame-orange/20 bg-frame-orange/[0.05] px-1.5 py-0.5 rounded text-frame-gray-light">{ex}</span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="liquid-glass overflow-hidden">
              {activities.slice(0, 6).map((act, idx) => {
                const dateStr = new Date(act.createdAt).toLocaleDateString(locale === "en" ? "en-US" : "pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <button
                    key={act.id}
                    type="button"
                    onClick={() => {
                      if (act.projectId) setLocation(`/project/${act.projectId}/studio/${act.toolId}`);
                      else setLocation(`/studio/${act.toolId}`);
                    }}
                    className="w-full flex items-center justify-between gap-4 px-5 py-3.5 text-left group transition-colors hover:bg-white/[0.03]"
                    style={{
                      borderBottom: idx < Math.min(activities.length, 6) - 1 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-2 h-2 rounded-full bg-frame-orange shrink-0 opacity-60" />
                      <p className="text-[0.84rem] text-frame-white truncate group-hover:text-frame-orange transition-colors">
                        {getActivityLabel(act)}
                      </p>
                    </div>
                    <span className="flex items-center gap-1.5 text-[0.64rem] font-frame-mono text-frame-gray-light shrink-0">
                      <Clock className="w-3 h-3" />
                      {dateStr}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── EMPTY STATE (sem nenhum projeto) ─── */}
        {!isProjectsLoading && projects.length === 0 && !focusProject && (
          <section className="frame-empty-state p-12 text-center space-y-5 animate-stagger-5">
            <div className="w-16 h-16 mx-auto flex items-center justify-center border border-frame-orange/30 bg-frame-orange/[0.08] rounded-full">
              <Plus className="w-7 h-7 text-frame-orange" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-frame-white">Comece sua história</h3>
              <p className="text-sm text-frame-gray-light max-w-sm mx-auto leading-relaxed">
                Cadastre o cliente, crie o projeto e mantenha briefing, proposta, produção e financeiro no mesmo lugar.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left py-2">
              <div className="border border-frame-orange/20 bg-frame-orange/[0.04] p-3 rounded-lg">
                <span className="block font-frame-mono text-[0.55rem] text-frame-orange uppercase tracking-wider mb-1">1. Cliente</span>
                <span className="text-[0.7rem] text-frame-gray-light">Cadastre quem contratou o job</span>
              </div>
              <div className="border border-frame-orange/20 bg-frame-orange/[0.04] p-3 rounded-lg">
                <span className="block font-frame-mono text-[0.55rem] text-frame-orange uppercase tracking-wider mb-1">2. Projeto</span>
                <span className="text-[0.7rem] text-frame-gray-light">Crie o job com briefing e prazo</span>
              </div>
              <div className="border border-frame-orange/20 bg-frame-orange/[0.04] p-3 rounded-lg">
                <span className="block font-frame-mono text-[0.55rem] text-frame-orange uppercase tracking-wider mb-1">3. Operar</span>
                <span className="text-[0.7rem] text-frame-gray-light">IA, arquivos, revisão e entrega</span>
              </div>
            </div>
            <button
              type="button"
              onClick={startProjectFromClient}
              className="frame-btn-primary inline-flex items-center gap-2 px-6 py-3"
            >
              <Plus className="w-4 h-4" />
              Começar primeiro job
            </button>
          </section>
        )}
      </main>

      {/* ─── CREATE MODAL ─── */}
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
                  placeholder={locale === "en" ? "e.g. 30s film, reels, case study, teaser" : "ex: filme 30s, reels, case, teaser"}
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
                  placeholder={locale === "en" ? "e.g. elegant, energetic, documentary" : "ex: elegante, energético, documental"}
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
                placeholder={locale === "en" ? "What does this project need to solve for the client?" : "O que esse projeto precisa resolver para o cliente?"}
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
                  <option value="">{locale === "en" ? "Select a client" : "Selecione um cliente"}</option>
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

      {/* DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        title={t("app.studio.projectSelector.deleteTitle") as string}
        description={t("app.studio.projectSelector.deleteDesc") as string}
        confirmText={t("app.studio.projectSelector.exclude") as string}
        cancelText={t("app.common.cancel") as string}
        variant="delete"
        isLoading={isSubmitting}
        itemName={projectToDelete?.name}
      />

      {/* Onboarding Modals */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
        onComplete={handleWelcomeComplete}
        onStartTour={handleStartTour}
        userName={user?.name || undefined}
      />

      <ProductTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onComplete={handleTourComplete}
      />
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
