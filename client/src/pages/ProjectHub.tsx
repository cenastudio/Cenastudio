import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import ProjectTasksPanel from "@/components/ProjectTasksPanel";
import ProjectTimeSummary from "@/components/timesheet/ProjectTimeSummary";
import { useAuth } from "@/contexts/AuthContext";
import {
  Film,
  FileText,
  FileSignature,
  Video,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  Loader2,
  Target,
  CheckCircle2,
  Circle,
  FolderOpen,
  Gauge,
  ExternalLink,
  Plus,
  Building2,
  CalendarPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api, type ProposalItem } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { isActionComplete, WORKFLOW_STAGES, type WorkflowStage } from "@/lib/workflow";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

interface ProjectDetail {
  id: number;
  name: string;
  description?: string;
  status?: string;
  clientId?: number | null;
  clientName?: string | null;
  metadataJson?: string;
  metadata_json?: string;
  createdAt?: string;
  updatedAt?: string;
  created_at: string;
  updated_at: string;
}

interface ProjectMember {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ProjectFile {
  id: number;
  name?: string;
  original_name?: string;
  type?: string;
  mime_type?: string;
  created_at: string;
}

interface ProjectReview {
  id: number;
  title: string;
  status: string;
  created_at: string;
}

interface ProjectMetadata {
  projectType?: string;
  deadline?: string;
  objective?: string;
  creativeGoals?: {
    format?: string;
    client?: string;
    tone?: string;
    budget?: string;
  };
}

const parseProjectMetadata = (project: ProjectDetail | null): ProjectMetadata => {
  if (!project) return {};
  try {
    return JSON.parse(project.metadataJson || project.metadata_json || "{}");
  } catch {
    return {};
  }
};

const QUICK_TOOLS = [
  { id: "07", slug: "briefing", nameKey: "app.hub.toolBriefing", icon: FileText, hintKey: "app.hub.hintBriefing" },
  { id: "01", slug: "roteiro", nameKey: "app.hub.toolScript", icon: Film, hintKey: "app.hub.hintScript" },
  { id: "02", slug: "decupagem", nameKey: "app.hub.toolBreakdown", icon: FolderOpen, hintKey: "app.hub.hintBreakdown" },
  { id: "03", slug: "callsheet", nameKey: "app.hub.toolCallsheet", icon: Calendar, hintKey: "app.hub.hintCallsheet" },
  { id: "04", slug: "orcamento", nameKey: "app.hub.toolBudget", icon: Gauge, hintKey: "app.hub.hintBudget" },
  { id: "08", slug: "moodboard", nameKey: "app.hub.toolMoodboard", icon: Target, hintKey: "app.hub.hintMoodboard" },
  { id: "__docs", slug: "documents", nameKey: "app.hub.toolDocs", icon: FileText, hintKey: "app.hub.hintDocs" },
];

// --- Client Link Component ---
function ClientLink({ clientId, clientName }: { clientId: number | null; clientName?: string | null }) {
  const [, setLocation] = useLocation();
  if (!clientId || !clientName) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); setLocation(`/clients/${clientId}`); }}
      className="inline-flex items-center gap-1 text-xs text-frame-orange hover:underline min-h-11 px-2 py-2"
    >
      <Building2 className="w-3 h-3" />
      {clientName}
    </button>
  );
}

// --- Timeline Step Component ---
function TimelineStep({
  stage,
  isComplete,
  isActive,
  isNext,
  onClick,
}: {
  stage: WorkflowStage;
  isComplete: boolean;
  isActive: boolean;
  isNext: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col items-center gap-1.5 px-3 py-2 transition min-w-[80px] ${
        isActive ? "opacity-100" : "opacity-70 hover:opacity-100"
      }`}
    >
      {/* Dot */}
      <div className="relative">
        {isComplete ? (
          <CheckCircle2 className="w-5 h-5 text-frame-orange" />
        ) : isNext ? (
          <div className="relative">
            <Circle className="w-5 h-5 text-frame-orange" />
            <span className="absolute inset-0 animate-ping rounded-full border border-frame-orange/40" />
          </div>
        ) : (
          <Circle className="w-5 h-5 text-frame-gray-light/50" />
        )}
      </div>
      {/* Number */}
      <span className="font-frame-mono text-[0.5rem] tracking-[0.14em] text-adaptive-primary">
        {stage.number}
      </span>
      {/* Label */}
      <span
        className={`font-frame-mono text-[0.6rem] tracking-[0.1em] uppercase text-center leading-tight ${
          isActive || isNext ? "text-frame-white" : "text-frame-gray-light"
        }`}
      >
        {stage.label}
      </span>
    </button>
  );
}

function ProjectHubContent() {
  const { t, locale } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = parseInt(id || "0");
  const { isTeamMember, teamRole } = useAuth();
  const canManageTasks = !isTeamMember || teamRole === "producer";
  const { hasAccess: hasCalendarExport } = useFeatureAccess("calendar-export");

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [recentFiles, setRecentFiles] = useState<ProjectFile[]>([]);
  const [recentReviews, setRecentReviews] = useState<ProjectReview[]>([]);
  const [commercialProposals, setCommercialProposals] = useState<ProposalItem[]>([]);
  const [populatedStates, setPopulatedStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Project team (spec team-task-delegation, Fase 6-A): allocate team members
  // to the project by userId. Owner/producer manage; reuses the workspace
  // roster endpoint used by task assignment.
  const [assignableMembers, setAssignableMembers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [addingMember, setAddingMember] = useState(false);

  const loadAssignableMembers = () => {
    if (assignableMembers.length > 0) return;
    api.tasks.listAssignableMembers(projectId).then(setAssignableMembers).catch(() => {});
  };

  const handleAddMember = async (memberUserId: number) => {
    try {
      const created = await api.projectMembers.add(projectId, { userId: memberUserId });
      setMembers((prev) => [...prev, { id: created.id, name: created.name || created.email || "", email: created.email || "", role: created.role }]);
      setAddingMember(false);
      toast.success(t("app.hub.memberAdded"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.hub.memberAddError"));
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    try {
      await api.projectMembers.remove(memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success(t("app.hub.memberRemoved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("app.hub.memberRemoveError"));
    }
  };

  useEffect(() => {
    if (project?.name) setProjectName(project.name);
  }, [project?.name]);

  const saveProjectName = async () => {
    if (!project) return;
    const trimmed = projectName.trim();
    if (!trimmed || trimmed === project.name) {
      // Reverte para o valor canônico se o usuário limpar o campo.
      if (!trimmed) setProjectName(project.name);
      return;
    }
    setSavingName(true);
    try {
      const updated = await api.projects.update(project.id, { name: trimmed });
      setProject((prev) => (prev ? { ...prev, ...updated } : prev));
      toast.success(t("app.hub.toastNameSaved"));
    } catch {
      toast.error(t("app.hub.toastNameError"));
      setProjectName(project.name);
    } finally {
      setSavingName(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/projects/${projectId}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/project-members/projects/${projectId}`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      fetch(`/api/files/projects/${projectId}`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ success: false })),
      fetch(`/api/video-reviews/projects/${projectId}`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      api.projects.populatedStates(projectId).catch(() => []),
      api.proposals.list({ projectId }).catch(() => []),
    ])
      .then(([projRes, colRes, filesRes, reviewsRes, statesRes, proposalRows]) => {
        if (projRes.success) setProject(projRes.data);
        else toast.error(t("app.hub.toastNotFound"));
        if (colRes.success) setMembers(colRes.data || []);
        if (filesRes.success) setRecentFiles((filesRes.data?.files || filesRes.data || []).slice(0, 5));
        if (reviewsRes.success) setRecentReviews((reviewsRes.data || []).slice(0, 5));
        setPopulatedStates((statesRes || []).map((state) => state.toolId));
        setCommercialProposals(proposalRows);
      })
      .catch(() => toast.error(t("app.hub.toastLoadError")))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
        <AppNavBar />
        {projectId ? <ProjectNav projectId={projectId} /> : null}
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-frame-orange" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
        <AppNavBar />
        {projectId ? <ProjectNav projectId={projectId} /> : null}
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="frame-label">{t("app.hub.notFound")}</p>
          <button type="button" onClick={() => setLocation("/projects")} className="frame-btn-ghost text-xs">
            {t("app.hub.backToProduction")}
          </button>
        </div>
      </div>
    );
  }

  const metadata = parseProjectMetadata(project);
  const stageStates = WORKFLOW_STAGES.map((stage) => {
    const toolActions = stage.actions.filter((action) => action.toolId || action.toolSlug);
    let complete = toolActions.length > 0 && toolActions.every((action) => isActionComplete(action, populatedStates));
    if (stage.id === "production") complete = recentFiles.length > 0 || members.length > 0;
    if (stage.id === "review") complete = recentReviews.some((review) => review.status === "approved");
    if (stage.id === "closing") complete = project.status === "completed" || project.status === "archived";
    return { ...stage, complete };
  });
  const completedSteps = stageStates.filter((stage) => stage.complete);
  const progress = Math.round((completedSteps.length / stageStates.length) * 100);
  const nextStep = stageStates.find((stage) => !stage.complete) || stageStates[stageStates.length - 1];
  const nextAction = nextStep.actions.find((action) => !isActionComplete(action, populatedStates)) || nextStep.actions[0];
  const createdAt = project.createdAt || project.created_at;
  const updatedAt = project.updatedAt || project.updated_at;
  const pendingReviews = recentReviews.filter((review) => review.status !== "approved").length;
  const clientName = project.clientName || metadata.creativeGoals?.client;
  const currentCommercialProposal = commercialProposals.find((proposal) => proposal.source_budget_id);

  return (
    <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
      <AppNavBar />
      <ProjectNav projectId={projectId} />

      <main id="main-content" className="max-w-7xl w-full mx-auto px-4 md:px-6 py-6 flex-1 space-y-6">

        {/* ═══ HERO: Identity of this job ═══ */}
        <section className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            <div className="min-w-0 space-y-3">
              {/* Project name + badge */}
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-frame-white">
                  {project.name}
                </h1>
                <span className="font-frame-mono text-[0.58rem] tracking-[0.12em] uppercase text-adaptive-primary border border-frame-orange/30 bg-frame-orange/[0.08] px-2 py-0.5">
                  {metadata.projectType || "audiovisual"}
                </span>
              </div>

              {/* Editable project name — persists via api.projects.update */}
              <div className="max-w-lg">
                <label
                  htmlFor="project-name-editable"
                  className="block font-frame-mono text-[0.55rem] tracking-[0.14em] uppercase text-frame-gray-light/70 mb-1"
                >
                  {t("app.hub.projectNameLabel")}
                </label>
                <input
                  id="project-name-editable"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  onBlur={saveProjectName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      (e.currentTarget as HTMLInputElement).blur();
                    }
                  }}
                  data-testid="project-name-editable"
                  aria-label={t("app.hub.projectNameLabel")}
                  className="frame-input text-sm min-h-11 w-full"
                  disabled={savingName}
                />
              </div>

              <ClientLink clientId={project.clientId ?? null} clientName={clientName ?? null} />

              {currentCommercialProposal && (
                <button
                  type="button"
                  onClick={() => setLocation(`/clients/${currentCommercialProposal.client_id}?tab=propostas`)}
                  className="flex w-full max-w-lg items-center gap-3 border border-frame-orange/35 bg-frame-orange/[0.04] px-3 py-3 text-left transition hover:border-frame-orange"
                >
                  <FileSignature className="h-4 w-4 shrink-0 text-frame-orange" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-frame-mono text-[0.56rem] uppercase tracking-[0.13em] text-frame-orange">
                      {locale === "en" ? "Commercial source" : "Origem comercial"}
                    </span>
                    <span className="mt-1 block truncate text-sm text-frame-white">
                      {currentCommercialProposal.status === "draft"
                        ? locale === "en" ? "Internal proposal draft" : "Rascunho interno de proposta"
                        : currentCommercialProposal.title}
                    </span>
                    <span className="mt-1 block text-[0.62rem] text-frame-gray-light">
                      {currentCommercialProposal.source_generation_id
                        ? locale === "en" ? "AI proposal + project budget" : "Proposta de IA + orçamento do projeto"
                        : locale === "en" ? "Project budget" : "Orçamento do projeto"}
                    </span>
                  </span>
                  <span className="font-frame-mono text-[0.58rem] text-frame-orange">
                    v{currentCommercialProposal.commercial_snapshot?.revision ?? 1}
                  </span>
                </button>
              )}

              {/* Origin context: client + objective */}
              {clientName && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-frame-orange font-medium">{clientName}</span>
                  {metadata.creativeGoals?.format && (
                    <span className="font-frame-mono text-[0.55rem] text-frame-gray-light border border-frame-gray-3 px-2 py-0.5">{metadata.creativeGoals.format}</span>
                  )}
                  {metadata.creativeGoals?.tone && (
                    <span className="font-frame-mono text-[0.55rem] text-frame-gray-light border border-frame-gray-3 px-2 py-0.5">{metadata.creativeGoals.tone}</span>
                  )}
                </div>
              )}
              {metadata.objective && (
                <p className="text-sm text-frame-gray-light">{metadata.objective}</p>
              )}

              {/* Meta strip: dates + deadline */}
              <div className="flex flex-wrap items-center gap-4 font-frame-mono text-[0.6rem] text-frame-gray-light tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {t("app.hub.created")} {new Date(createdAt).toLocaleDateString(locale === "en" ? "en-US" : "pt-BR")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {t("app.hub.updated")} {new Date(updatedAt).toLocaleDateString(locale === "en" ? "en-US" : "pt-BR")}
                </span>
                {metadata.deadline && (
                  <span className="flex items-center gap-1.5 text-frame-orange">
                    <Target className="w-3 h-3" />
                    {locale === "en" ? "Deadline" : "Prazo"} {new Date(`${metadata.deadline}T00:00:00`).toLocaleDateString(locale === "en" ? "en-US" : "pt-BR")}
                  </span>
                )}
              </div>

              {/* Calendar Export - Highlighted action (Studio+ feature) */}
              {hasCalendarExport && (
              <div className="pt-3 border-t border-frame-gray-3/50">
                <a
                  href={api.calendar.projectIcsUrl(projectId)}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 border border-frame-gray-3 bg-frame-gray-1/20 hover:border-frame-orange hover:bg-frame-orange/10 text-frame-white hover:text-frame-orange transition-all text-sm font-medium group"
                  title={
                    locale === "en"
                      ? "Download project schedule as .ics file (compatible with Google Calendar, Outlook, Apple Calendar)"
                      : "Baixar cronograma do projeto como arquivo .ics (compatível com Google Calendar, Outlook, Apple Calendar)"
                  }
                >
                  <CalendarPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>{locale === "en" ? "Export to Calendar" : "Exportar para Agenda"}</span>
                  <span className="text-[0.65rem] px-1.5 py-0.5 bg-frame-gray-2 text-frame-gray-light font-frame-mono rounded group-hover:bg-frame-orange/20 group-hover:text-adaptive-primary transition">
                    .ics
                  </span>
                </a>
                <p className="text-[0.6rem] text-frame-gray-muted mt-1.5 font-frame-mono tracking-wide">
                  {locale === "en"
                    ? "Includes project deadline + linked meetings"
                    : "Inclui prazo do projeto + reuniões vinculadas"}
                </p>
              </div>
              )}
            </div>

            {/* Quick stats */}
            <div className="flex gap-4 shrink-0">
              <div className="text-center">
                <strong className="block text-lg text-frame-white">{recentFiles.length}</strong>
                <span className="font-frame-mono text-[0.55rem] tracking-wider uppercase text-frame-gray-light">{t("app.hub.files")}</span>
              </div>
              <div className="text-center">
                <strong className="block text-lg text-frame-white">{recentReviews.length}</strong>
                <span className="font-frame-mono text-[0.55rem] tracking-wider uppercase text-frame-gray-light">{t("app.hub.reviews")}</span>
              </div>
              <div className="text-center">
                <strong className="block text-lg text-frame-white">{members.length}</strong>
                <span className="font-frame-mono text-[0.55rem] tracking-wider uppercase text-frame-gray-light">{t("app.hub.team")}</span>
              </div>
              <div className="text-center">
                <strong className="block text-lg text-frame-orange">{progress}%</strong>
                <span className="font-frame-mono text-[0.55rem] tracking-wider uppercase text-frame-gray-light">{t("app.hub.progress")}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ TIMELINE: Where this job IS in the story ═══ */}
        <section className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
          {/* Progress bar */}
          <div className="h-1 bg-frame-gray-2 mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-frame-orange/80 to-frame-orange transition-[width] duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <label className="sr-only" htmlFor="project-stage-mobile">
            {locale === "en" ? "Project stage" : "Etapa do projeto"}
          </label>
          <select
            id="project-stage-mobile"
            value={nextStep.id}
            onChange={(event) => setLocation(`/project/${projectId}/journey/${event.target.value}`)}
            className="sm:hidden w-full min-h-11 bg-frame-gray-1 border border-frame-gray-3 px-3 text-sm text-frame-white outline-none focus:border-frame-orange"
          >
            {stageStates.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.number} · {stage.label}
              </option>
            ))}
          </select>

          {/* Stage dots + connectors */}
          <div className="hidden sm:flex items-start justify-between -mx-2">
            {stageStates.map((stage) => (
              <TimelineStep
                key={stage.id}
                stage={stage}
                isComplete={stage.complete}
                isActive={stage.id === nextStep.id}
                isNext={stage.id === nextStep.id}
                onClick={() => setLocation(`/project/${projectId}/journey/${stage.id}`)}
              />
            ))}
          </div>
        </section>

        {/* ═══ NEXT ACTION: What to do NOW ═══ */}
        <section className="border border-frame-orange/40 bg-frame-orange/[0.04] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-frame-mono text-[0.58rem] tracking-[0.14em] uppercase text-adaptive-primary mb-1">
                <span>{t("app.hub.nextStep")}</span> <span>{nextStep.label}</span>
              </p>
              <h2 className="text-lg font-semibold text-frame-white">{nextAction.label}</h2>
              <p className="text-sm text-frame-gray-light mt-1 leading-relaxed max-w-lg">
                {nextAction.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLocation(nextAction.route(projectId))}
              className="frame-btn-primary !py-3 !px-6 min-h-11 flex items-center gap-2 shrink-0"
            >
              {t("app.hub.open")} {nextAction.label}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        {/* ═══ MAIN CONTENT: Two columns ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN (2/3): Tools + Files + Reviews */}
          <div className="lg:col-span-2 space-y-6">

            {/* Quick tools — prominent */}
            <section>
              <div className="mb-3">
                <h3 className="font-frame-mono text-[0.65rem] tracking-[0.14em] uppercase text-frame-gray-light">
                  {t("app.hub.tools")}
                </h3>
                <p className="text-[0.65rem] text-frame-gray-light mt-1">
                  {t("app.hub.toolsDesc")}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {QUICK_TOOLS.map((tool) => {
                  const ToolIcon = tool.icon;
                  const hasContent = populatedStates.includes(tool.id) || populatedStates.includes(tool.slug);
                  const toolRoute = tool.id === "__docs"
                    ? `/project/${projectId}/documents`
                    : `/project/${projectId}/studio/${tool.slug}`;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setLocation(toolRoute)}
                      className={`border p-4 text-left transition group hover:border-frame-orange/40 ${
                        hasContent ? "border-frame-orange/30 bg-frame-orange/[0.04]" : "border-frame-gray-3/50 bg-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <ToolIcon className={`w-5 h-5 shrink-0 mt-0.5 transition ${hasContent ? "text-frame-orange" : "text-frame-gray-light group-hover:text-frame-orange"}`} />
                        <div className="min-w-0">
                          <span className="block text-sm font-medium text-frame-white group-hover:text-frame-orange transition">
                            {t(tool.nameKey)}
                          </span>
                          <span className="block text-[0.6rem] text-frame-gray-light mt-0.5 leading-relaxed">
                            {t(tool.hintKey)}
                          </span>
                          {hasContent && (
                            <span className="inline-block mt-1.5 font-frame-mono text-[0.5rem] text-adaptive-primary border border-frame-orange/30 px-1.5 py-0.5">{t("app.hub.filled")}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Tarefas do Projeto (spec: team-task-delegation) */}
            <ProjectTasksPanel projectId={projectId} canManage={canManageTasks} />

            <ProjectTimeSummary projectId={projectId} />

            {/* Recent Files */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-frame-mono text-[0.65rem] tracking-[0.14em] uppercase text-frame-gray-light flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  {t("app.hub.recentFiles")}
                </h3>
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/files`)}
                  className="inline-flex items-center font-frame-mono text-[0.6rem] text-adaptive-primary hover:text-frame-white transition tracking-wider min-h-11 px-3"
                >
                  {t("app.hub.viewAll")}
                </button>
              </div>
              {recentFiles.length === 0 ? (
                <p className="text-xs text-frame-gray-light/60 italic frame-empty-state p-4 text-center">
                  {t("app.hub.noFiles")}
                </p>
              ) : (
                <div className="border border-frame-gray-3/50 divide-y divide-frame-gray-3/30">
                  {recentFiles.map((f) => (
                    <div key={f.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                      <span className="text-frame-gray-light truncate">{f.name || f.original_name || t("app.hub.fileFallback")}</span>
                      <span className="text-[0.58rem] font-frame-mono text-frame-gray-light/60 uppercase ml-auto shrink-0">
                        {new Date(f.created_at).toLocaleDateString(locale === "en" ? "en-US" : "pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Video Reviews */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-frame-mono text-[0.65rem] tracking-[0.14em] uppercase text-frame-gray-light flex items-center gap-2">
                  <Video className="w-3.5 h-3.5" />
                  {t("app.hub.approvals")}
                  {pendingReviews > 0 && (
                    <span className="ml-1 text-[0.55rem] px-1.5 py-0.5 bg-frame-orange/20 border border-frame-orange/40 text-adaptive-primary">
                      {pendingReviews} {pendingReviews > 1 ? t("app.hub.pendingPlural") : t("app.hub.pendingSingular")}
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/video-reviews`)}
                  className="inline-flex items-center font-frame-mono text-[0.6rem] text-adaptive-primary hover:text-frame-white transition tracking-wider min-h-11 px-3"
                >
                  {t("app.hub.viewAll")}
                </button>
              </div>
              {recentReviews.length === 0 ? (
                <p className="text-xs text-frame-gray-light/60 italic frame-empty-state p-4 text-center">
                  {t("app.hub.noReviews")}
                </p>
              ) : (
                <div className="border border-frame-gray-3/50 divide-y divide-frame-gray-3/30">
                  {recentReviews.map((r) => (
                    <div key={r.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                      <span className="text-frame-white truncate">{r.title}</span>
                      <span className={`text-[0.58rem] font-frame-mono uppercase ml-auto px-1.5 py-0.5 border shrink-0 ${
                        r.status === "approved" ? "border-green-500/30 text-green-400" :
                        r.status === "rejected" ? "border-red-500/30 text-red-400" :
                        r.status === "pending_review" ? "border-yellow-500/30 text-yellow-400" :
                        "border-frame-gray-3 text-frame-gray-light"
                      }`}>
                        {r.status === "approved" ? t("app.hub.statusApproved") :
                         r.status === "rejected" ? t("app.hub.statusRejected") :
                         r.status === "pending_review" ? t("app.hub.statusPending") : r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN (1/3): Context sidebar */}
          <div className="space-y-5">

            {/* Client / Origin */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <h3 className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-gray-light mb-3 flex items-center gap-2">
                <ExternalLink className="w-3 h-3 text-frame-orange" />
                {t("app.hub.jobOrigin")}
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="block font-frame-mono text-[0.55rem] tracking-[0.1em] uppercase text-frame-gray-light/70 mb-0.5">{t("app.hub.client")}</span>
                  {clientName ? (
                    <button
                      type="button"
                      onClick={() => project.clientId ? setLocation(`/clients/${project.clientId}`) : undefined}
                      className={`inline-flex items-center text-frame-white font-medium min-h-11 py-2 ${project.clientId ? "hover:text-frame-orange transition" : ""}`}
                    >
                      {clientName}
                    </button>
                  ) : (
                    <span className="text-frame-gray-light/60 italic">{t("app.hub.notDefined")}</span>
                  )}
                </div>
                {project.description && (
                  <div>
                    <span className="block font-frame-mono text-[0.55rem] tracking-[0.1em] uppercase text-frame-gray-light/70 mb-0.5">{t("app.hub.description")}</span>
                    <p className="text-frame-gray-light leading-relaxed">{project.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Creative Direction */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <h3 className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-gray-light mb-3 flex items-center gap-2">
                <Target className="w-3 h-3 text-frame-orange" />
                {t("app.hub.creativeDirection")}
              </h3>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block font-frame-mono text-[0.55rem] tracking-[0.1em] uppercase text-frame-gray-light/70 mb-0.5">{t("app.hub.format")}</span>
                    <p className="text-frame-white">{metadata.creativeGoals?.format || "—"}</p>
                  </div>
                  <div>
                    <span className="block font-frame-mono text-[0.55rem] tracking-[0.1em] uppercase text-frame-gray-light/70 mb-0.5">{t("app.hub.tone")}</span>
                    <p className="text-frame-white">{metadata.creativeGoals?.tone || "—"}</p>
                  </div>
                </div>
                {metadata.creativeGoals?.budget && (
                  <div>
                    <span className="block font-frame-mono text-[0.55rem] tracking-[0.1em] uppercase text-frame-gray-light/70 mb-0.5">{t("app.hub.budget")}</span>
                    <p className="text-frame-white">{metadata.creativeGoals.budget}</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLocation(`/project/${projectId}/studio/briefing`)}
                className="w-full mt-3 text-[0.6rem] font-frame-mono tracking-wider text-frame-gray-light hover:text-adaptive-primary transition border border-dashed border-frame-gray-3/60 min-h-11 py-2 flex items-center justify-center gap-1"
              >
                <FileText className="w-3 h-3" />
                {t("app.hub.editBriefing")}
              </button>
            </div>

            {/* Team — allocate workspace team members to this project */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-gray-light flex items-center gap-2">
                  <Users className="w-3 h-3 text-frame-gray-light" />
                  {t("app.hub.team")}
                </h3>
                <button
                  type="button"
                  onClick={() => setLocation("/team")}
                  className="inline-flex items-center font-frame-mono text-[0.55rem] text-adaptive-primary hover:text-frame-white transition min-h-11 px-3"
                >
                  {t("app.hub.manage")}
                </button>
              </div>
              {members.length === 0 ? (
                <p className="text-[0.65rem] text-frame-gray-light/60 italic">{t("app.hub.noMembers")}</p>
              ) : (
                <div className="space-y-1.5">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs group/member">
                      <div className="w-5 h-5 rounded-full bg-frame-orange/20 border border-frame-orange/30 flex items-center justify-center text-[0.55rem] font-frame-mono shrink-0 text-adaptive-primary">
                        {(m.name || m.email)[0].toUpperCase()}
                      </div>
                      <span className="truncate text-frame-white">{m.name || m.email}</span>
                      <span className="ml-auto text-[0.55rem] font-frame-mono text-frame-gray-light shrink-0">{m.role || "member"}</span>
                      {canManageTasks && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id)}
                          className="shrink-0 text-frame-gray-light hover:text-frame-red transition opacity-0 group-hover/member:opacity-100"
                          title={t("app.hub.removeMember")}
                          aria-label={t("app.hub.removeMember")}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {canManageTasks && (
                addingMember ? (
                  <select
                    autoFocus
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) handleAddMember(Number(e.target.value)); }}
                    onBlur={() => setAddingMember(false)}
                    className="frame-input w-full mt-3 text-xs"
                    aria-label={t("app.hub.addMember")}
                  >
                    <option value="" disabled>{t("app.hub.selectMember")}</option>
                    {assignableMembers
                      .filter((am) => !members.some((mm) => mm.email === am.email))
                      .map((am) => (
                        <option key={am.id} value={am.id}>{am.name || am.email}</option>
                      ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => { loadAssignableMembers(); setAddingMember(true); }}
                    className="w-full mt-3 text-[0.6rem] font-frame-mono tracking-wider text-frame-orange border border-dashed border-frame-orange/30 min-h-11 py-2 flex items-center justify-center gap-1 hover:bg-frame-orange/[0.04] transition"
                  >
                    <Plus className="w-3 h-3" />
                    {t("app.hub.addMember")}
                  </button>
                )
              )}
            </div>

            {/* Export */}
            <button
              type="button"
              onClick={() => {
                const a = document.createElement("a");
                a.href = `/api/export/projects/${projectId}`;
                a.click();
              }}
              className="w-full font-frame-mono text-[0.6rem] tracking-wider text-frame-gray-light border border-frame-gray-3/50 min-h-11 py-2.5 hover:border-frame-orange/40 hover:text-adaptive-primary transition flex items-center justify-center gap-1.5"
            >
              <ArrowRight className="w-3 h-3" />
              {t("app.hub.exportProject")}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProjectHub() {
  return (
    <ProtectedRoute>
      <ProjectHubContent />
    </ProtectedRoute>
  );
}
