import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Film,
  FileText,
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
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { isActionComplete, WORKFLOW_STAGES, type WorkflowStage } from "@/lib/workflow";

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
      className="flex items-center gap-1 text-xs text-frame-orange hover:underline"
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
      <span className="font-frame-mono text-[0.5rem] tracking-[0.14em] text-frame-orange">
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

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [recentFiles, setRecentFiles] = useState<ProjectFile[]>([]);
  const [recentReviews, setRecentReviews] = useState<ProjectReview[]>([]);
  const [populatedStates, setPopulatedStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);

    Promise.all([
      fetch(`/api/projects/${projectId}`, { credentials: "include" }).then((r) => r.json()),
      fetch(`/api/project-members/projects/${projectId}`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      fetch(`/api/files/projects/${projectId}`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ success: false })),
      fetch(`/api/video-reviews/projects/${projectId}`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ success: false, data: [] })),
      api.projects.populatedStates(projectId).catch(() => []),
    ])
      .then(([projRes, colRes, filesRes, reviewsRes, statesRes]) => {
        if (projRes.success) setProject(projRes.data);
        else toast.error(t("app.hub.toastNotFound"));
        if (colRes.success) setMembers(colRes.data || []);
        if (filesRes.success) setRecentFiles((filesRes.data?.files || filesRes.data || []).slice(0, 5));
        if (reviewsRes.success) setRecentReviews((reviewsRes.data || []).slice(0, 5));
        setPopulatedStates((statesRes || []).map((state) => state.toolId));
      })
      .catch(() => toast.error(t("app.hub.toastLoadError")))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
        <AppNavBar />
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

  return (
    <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
      <AppNavBar />

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
                <span className="font-frame-mono text-[0.58rem] tracking-[0.12em] uppercase text-frame-orange border border-frame-orange/30 bg-frame-orange/[0.08] px-2 py-0.5">
                  {metadata.projectType || "audiovisual"}
                </span>
              </div>
              <ClientLink clientId={project.clientId ?? null} clientName={clientName ?? null} />

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

          {/* Stage dots + connectors */}
          <div className="flex items-start justify-between overflow-x-auto scrollbar-none -mx-2">
            {stageStates.map((stage, i) => (
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
              <p className="font-frame-mono text-[0.58rem] tracking-[0.14em] uppercase text-frame-orange mb-1">
                {t("app.hub.nextStep")} {nextStep.label}
              </p>
              <h2 className="text-lg font-semibold text-frame-white">{nextAction.label}</h2>
              <p className="text-sm text-frame-gray-light mt-1 leading-relaxed max-w-lg">
                {nextAction.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLocation(nextAction.route(projectId))}
              className="frame-btn-primary !py-3 !px-6 flex items-center gap-2 shrink-0"
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
                            <span className="inline-block mt-1.5 font-frame-mono text-[0.5rem] text-frame-orange border border-frame-orange/30 px-1.5 py-0.5">{t("app.hub.filled")}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

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
                  className="font-frame-mono text-[0.6rem] text-frame-orange hover:text-frame-white transition tracking-wider"
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
                    <span className="ml-1 text-[0.55rem] px-1.5 py-0.5 bg-frame-orange/20 border border-frame-orange/40 text-frame-orange">
                      {pendingReviews} {pendingReviews > 1 ? t("app.hub.pendingPlural") : t("app.hub.pendingSingular")}
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/video-reviews`)}
                  className="font-frame-mono text-[0.6rem] text-frame-orange hover:text-frame-white transition tracking-wider"
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
                      className={`text-frame-white font-medium ${project.clientId ? "hover:text-frame-orange transition" : ""}`}
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
                className="w-full mt-3 text-[0.6rem] font-frame-mono tracking-wider text-frame-gray-light hover:text-frame-orange transition border border-dashed border-frame-gray-3/60 py-2 flex items-center justify-center gap-1"
              >
                <FileText className="w-3 h-3" />
                {t("app.hub.editBriefing")}
              </button>
            </div>

            {/* Team */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-gray-light flex items-center gap-2">
                  <Users className="w-3 h-3 text-frame-gray-light" />
                  {t("app.hub.team")}
                </h3>
                <button
                  type="button"
                  onClick={() => setLocation("/team")}
                  className="font-frame-mono text-[0.55rem] text-frame-orange hover:text-frame-white transition"
                >
                  {t("app.hub.manage")}
                </button>
              </div>
              {members.length === 0 ? (
                <p className="text-[0.65rem] text-frame-gray-light/60 italic">{t("app.hub.noMembers")}</p>
              ) : (
                <div className="space-y-1.5">
                  {members.slice(0, 4).map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <div className="w-5 h-5 rounded-full bg-frame-orange/20 border border-frame-orange/30 flex items-center justify-center text-[0.55rem] font-frame-mono shrink-0 text-frame-orange">
                        {(m.name || m.email)[0].toUpperCase()}
                      </div>
                      <span className="truncate text-frame-white">{m.name || m.email}</span>
                      <span className="ml-auto text-[0.55rem] font-frame-mono text-frame-gray-light shrink-0">{m.role || "member"}</span>
                    </div>
                  ))}
                  {members.length > 4 && (
                    <span className="block text-[0.6rem] text-frame-gray-light">+{members.length - 4} {t("app.hub.more")}</span>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => setLocation("/team")}
                className="w-full mt-3 text-[0.6rem] font-frame-mono tracking-wider text-frame-orange border border-dashed border-frame-orange/30 py-2 flex items-center justify-center gap-1 hover:bg-frame-orange/[0.04] transition"
              >
                <Plus className="w-3 h-3" />
                {t("app.hub.addMember")}
              </button>
            </div>

            {/* Export */}
            <button
              type="button"
              onClick={() => {
                const a = document.createElement("a");
                a.href = `/api/export/projects/${projectId}`;
                a.click();
              }}
              className="w-full font-frame-mono text-[0.6rem] tracking-wider text-frame-gray-light border border-frame-gray-3/50 py-2.5 hover:border-frame-orange/40 hover:text-frame-orange transition flex items-center justify-center gap-1.5"
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
