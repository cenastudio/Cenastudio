import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
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
  ChevronRight,
  Target,
  CheckCircle2,
  Circle,
  FolderOpen,
  Gauge,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProjectDetail {
  id: number;
  name: string;
  description?: string;
  status?: string;
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

const QUICK_TOOLS = [
  { id: "07", slug: "briefing", name: "Briefing", icon: FileText },
  { id: "01", slug: "roteiro", name: "Roteiro", icon: Film },
  { id: "02", slug: "decupagem", name: "Decupagem", icon: FolderOpen },
  { id: "03", slug: "callsheet", name: "Callsheet", icon: Calendar },
  { id: "04", slug: "orcamento", name: "Orçamento", icon: Gauge },
  { id: "08", slug: "moodboard", name: "Moodboard", icon: Target },
];

const WORKFLOW_STEPS = [
  { slug: "briefing", label: "Briefing", hint: "app.projectHub.stepBriefingHint" },
  { slug: "roteiro", label: "Roteiro", hint: "app.projectHub.stepScriptHint" },
  { slug: "decupagem", label: "Decupagem", hint: "app.projectHub.stepBreakdownHint" },
  { slug: "callsheet", label: "Callsheet", hint: "app.projectHub.stepCallsheetHint" },
  { slug: "orcamento", label: "Orçamento", hint: "app.projectHub.stepBudgetHint" },
  { slug: "moodboard", label: "Moodboard", hint: "app.projectHub.stepMoodboardHint" },
];

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

function ProjectHubContent() {
  const { t } = useLanguage();
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
        else toast.error(t("app.errors.projectNotFound"));
        if (colRes.success) setMembers(colRes.data || []);
        if (filesRes.success) setRecentFiles((filesRes.data?.files || filesRes.data || []).slice(0, 5));
        if (reviewsRes.success) setRecentReviews((reviewsRes.data || []).slice(0, 5));
        setPopulatedStates((statesRes || []).map((state) => state.toolId));
      })
      .catch(() => toast.error(t("app.errors.loadProject")))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
        <AppNavBar />
        <ProjectNav projectId={projectId} />
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
        <ProjectNav projectId={projectId} />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <p className="frame-label">{t("app.projectHub.projectNotFound")}</p>
          <button type="button" onClick={() => setLocation("/dashboard")} className="frame-btn-ghost text-xs">
            {t("app.common.backToDashboard")}
          </button>
        </div>
      </div>
    );
  }

  const metadata = parseProjectMetadata(project);
  const completedSteps = WORKFLOW_STEPS.filter((step) => populatedStates.includes(step.slug));
  const progress = Math.round((completedSteps.length / WORKFLOW_STEPS.length) * 100);
  const nextStep = WORKFLOW_STEPS.find((step) => !populatedStates.includes(step.slug)) || WORKFLOW_STEPS[0];
  const createdAt = project.createdAt || project.created_at;
  const updatedAt = project.updatedAt || project.updated_at;
  const pendingReviews = recentReviews.filter((review) => review.status !== "approved").length;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white flex flex-col">
      <AppNavBar />
      <ProjectNav projectId={projectId} />
      <main id="main-content" className="max-w-7xl w-full mx-auto px-6 py-8 flex-1">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-frame-gray-3">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="frame-label mb-2">// Projeto #{project.id}</p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-frame-white">{project.name}</h1>
                <span className="font-frame-mono text-[0.64rem] tracking-[0.14em] uppercase text-frame-orange border border-frame-orange/30 bg-frame-orange/[0.08] px-2 py-1">
                  {metadata.projectType || project.status || t("app.projectHub.active")}
                </span>
              </div>
              {project.description && (
                <p className="text-frame-gray-light text-sm mt-1 max-w-2xl leading-relaxed">{project.description}</p>
              )}
              {metadata.objective && (
                <div className="mt-4 border-l-2 border-frame-orange pl-4 max-w-2xl">
                  <span className="block font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-gray-light mb-1">
                    {t("app.projectHub.objective")}
                  </span>
                  <p className="text-sm text-frame-white leading-relaxed">{metadata.objective}</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-4 font-frame-mono text-[0.64rem] text-frame-gray-light tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {t("app.projectHub.created")} {new Date(createdAt).toLocaleDateString("pt-BR")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {t("app.projectHub.updated")} {new Date(updatedAt).toLocaleDateString("pt-BR")}
                </span>
                {metadata.deadline && (
                  <span className="flex items-center gap-1.5 text-frame-orange">
                    <Target className="w-3 h-3" />
                    {t("app.projectHub.deadline")} {new Date(`${metadata.deadline}T00:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>

            <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4 w-full lg:w-[300px] shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="font-frame-mono text-[0.64rem] tracking-[0.15em] uppercase text-frame-gray-light">
                  {t("app.projectHub.progress")}
                </span>
                <strong className="text-frame-white">{progress}%</strong>
              </div>
              <div className="h-2 bg-frame-gray-2 border border-frame-gray-3 overflow-hidden mb-4">
                <div className="h-full bg-frame-orange transition-[width] duration-300 ease-out" style={{ width: `${progress}%` }} />
              </div>
              <button
                type="button"
                onClick={() => setLocation(`/project/${projectId}/studio/${nextStep.slug}`)}
                className="w-full frame-btn-primary !py-2.5 !px-4 !text-[0.6rem] flex items-center justify-center gap-2"
              >
                {t("app.projectHub.continue")} {nextStep.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <p className="mt-3 text-[0.68rem] leading-relaxed text-frame-gray-light">
                {t(nextStep.hint)}
              </p>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
            <span className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-gray-light">{t("app.projectHub.files")}</span>
            <strong className="block text-2xl text-frame-white mt-2">{recentFiles.length}</strong>
          </div>
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
            <span className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-gray-light">{t("app.projectHub.approvals")}</span>
            <strong className="block text-2xl text-frame-white mt-2">{recentReviews.length}</strong>
          </div>
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
            <span className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-gray-light">{t("app.projectHub.pendingItems")}</span>
            <strong className="block text-2xl text-frame-white mt-2">{pendingReviews}</strong>
          </div>
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
            <span className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-gray-light">{t("app.projectHub.team")}</span>
            <strong className="block text-2xl text-frame-white mt-2">{members.length}</strong>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Workflow */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-frame-gray-3 pb-2.5">
                <h2 className="font-frame-mono text-sm tracking-[0.15em] uppercase text-frame-white font-semibold flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-frame-orange" />
                  {t("app.projectHub.projectFlow")}
                </h2>
                <span className="font-frame-mono text-[0.64rem] text-frame-gray-light tracking-wider">
                  {completedSteps.length}/{WORKFLOW_STEPS.length} {t("app.projectHub.steps")}
                </span>
              </div>
              <div className="border border-frame-orange/40 bg-frame-orange/[0.05] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-frame-mono text-[0.62rem] tracking-[0.14em] uppercase text-frame-orange mb-1">
                    {t("app.projectHub.nextOperationalMove")}
                  </p>
                  <h3 className="text-base font-semibold text-frame-white">{nextStep.label}</h3>
                  <p className="text-xs text-frame-gray-light mt-1 leading-relaxed">{t(nextStep.hint)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/studio/${nextStep.slug}`)}
                  className="frame-btn-primary !py-2.5 !px-4 !text-[0.6rem] shrink-0"
                >
                  {t("app.projectHub.openStep")}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WORKFLOW_STEPS.map((step) => {
                  const isDone = populatedStates.includes(step.slug);
                  const isNext = step.slug === nextStep.slug;

                  return (
                    <button
                      key={step.slug}
                      type="button"
                      onClick={() => setLocation(`/project/${projectId}/studio/${step.slug}`)}
                      className={`text-left border p-4 transition group ${
                        isNext
                          ? "border-frame-orange/60 bg-frame-orange/[0.06]"
                          : "border-frame-gray-3 bg-frame-gray-1/10 hover:border-frame-orange/35"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-frame-orange" />
                          ) : (
                            <Circle className="w-4 h-4 text-frame-gray-light" />
                          )}
                          <span className="text-sm font-medium text-frame-white group-hover:text-frame-orange transition">
                            {step.label}
                          </span>
                        </div>
                        {isNext && (
                          <span className="font-frame-mono text-[0.6rem] tracking-[0.12em] uppercase text-frame-orange">
                            {t("app.projectHub.next")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-frame-gray-light mt-2 leading-relaxed">{t(step.hint)}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Quick Access Tools */}
            <section className="space-y-4">
              <h2 className="font-frame-mono text-sm tracking-[0.15em] uppercase text-frame-white font-semibold">
                {t("app.projectHub.tools")}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {QUICK_TOOLS.map((tool) => {
                  const ToolIcon = tool.icon;

                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setLocation(`/project/${projectId}/studio/${tool.slug}`)}
                      className="border border-frame-gray-3 bg-frame-gray-1/10 p-4 text-left hover:border-frame-orange/40 hover:bg-frame-orange/[0.04] transition group cursor-pointer"
                    >
                      <ToolIcon className="w-5 h-5 text-frame-orange mb-3" />
                      <span className="block text-xs font-medium text-frame-white group-hover:text-frame-orange transition">
                        {tool.name}
                      </span>
                      <span className="block text-[0.62rem] font-frame-mono text-frame-gray-light tracking-wider mt-1">
                        {t("app.projectHub.openAction")} →
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setLocation(`/project/${projectId}/studio/roteiro`)}
                className="text-xs text-frame-orange hover:text-frame-white transition font-frame-mono tracking-wider flex items-center gap-1"
              >
                <Film className="w-3 h-3" />
                {t("app.projectHub.openFullStudio")} →
              </button>
            </section>

            {/* Recent Files */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-frame-gray-3 pb-2.5">
                <h2 className="font-frame-mono text-sm tracking-[0.15em] uppercase text-frame-white font-semibold flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-frame-gray-light" />
                  {t("app.projectHub.recentMaterials")}
                </h2>
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/files`)}
                  className="text-[0.64rem] font-frame-mono text-frame-orange hover:text-frame-white transition tracking-wider"
                >
                  {t("app.projectHub.viewAll")} →
                </button>
              </div>
              {recentFiles.length === 0 ? (
                <p className="text-xs text-frame-gray-light italic">{t("app.projectHub.noFilesInThisProject")}</p>
              ) : (
                <div className="border border-frame-gray-3 divide-y divide-frame-gray-3">
                  {recentFiles.map((f) => (
                    <div key={f.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                      <span className="text-frame-gray-light">{f.name || f.original_name || t("app.projectHub.fileWithoutName")}</span>
                      <span className="text-[0.62rem] font-frame-mono text-frame-gray-light uppercase ml-auto">
                        {f.type || f.mime_type || "arquivo"} · {new Date(f.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Recent Video Reviews */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-frame-gray-3 pb-2.5">
                <h2 className="font-frame-mono text-sm tracking-[0.15em] uppercase text-frame-white font-semibold flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-frame-gray-light" />
                  {t("app.projectHub.videoApprovals")}
                </h2>
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/video-reviews`)}
                  className="text-[0.64rem] font-frame-mono text-frame-orange hover:text-frame-white transition tracking-wider"
                >
                  {t("app.projectHub.viewAll")} →
                </button>
              </div>
              {recentReviews.length === 0 ? (
                <p className="text-xs text-frame-gray-light italic">{t("app.projectHub.noApprovalsInThisProject")}</p>
              ) : (
                <div className="border border-frame-gray-3 divide-y divide-frame-gray-3">
                  {recentReviews.map((r) => (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                      <span className="text-frame-white">{r.title}</span>
                      <span className={`text-[0.62rem] font-frame-mono uppercase ml-auto px-1.5 py-0.5 border ${
                        r.status === "approved" ? "border-green-500/30 text-green-400" :
                        r.status === "rejected" ? "border-red-500/30 text-red-400" :
                        r.status === "pending_review" ? "border-yellow-500/30 text-yellow-400" :
                        "border-frame-gray-3 text-frame-gray-light"
                      }`}>
                        {r.status === "approved" ? t("app.projectHub.approved") :
                         r.status === "rejected" ? t("app.projectHub.rejected") :
                         r.status === "pending_review" ? t("app.projectHub.pending") : r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Briefing Snapshot */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <h3 className="font-frame-mono text-xs tracking-[0.15em] uppercase mb-3 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-frame-orange" />
                {t("app.projectHub.creativeDirection")}
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="block font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase text-frame-gray-light mb-1">
                    {t("app.projectHub.client")}
                  </span>
                  <p className="text-frame-white">{metadata.creativeGoals?.client || t("app.projectHub.notDefined")}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase text-frame-gray-light mb-1">
                      {t("app.projectHub.format")}
                    </span>
                    <p className="text-frame-white">{metadata.creativeGoals?.format || t("app.projectHub.open")}</p>
                  </div>
                  <div>
                    <span className="block font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase text-frame-gray-light mb-1">
                      {t("app.projectHub.tone")}
                    </span>
                    <p className="text-frame-white">{metadata.creativeGoals?.tone || t("app.projectHub.open")}</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLocation(`/project/${projectId}/studio/briefing`)}
                className="w-full mt-4 text-xs font-frame-mono tracking-wider text-frame-gray-light hover:text-frame-white transition border border-dashed border-frame-gray-3 py-2 flex items-center justify-center gap-1"
              >
                <FileText className="w-3 h-3" />
                {t("app.projectHub.editBriefing")}
              </button>
            </div>

            {/* Members */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-frame-mono text-xs tracking-[0.15em] uppercase flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-frame-gray-light" />
                  {t("app.projectHub.team")}
                </h3>
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/collaborators`)}
                  className="text-[0.62rem] font-frame-mono text-frame-orange hover:text-frame-white transition"
                >
                  {t("app.projectHub.manage")} →
                </button>
              </div>
              {members.length === 0 ? (
                <p className="text-xs text-frame-gray-light italic">{t("app.projectHub.noMembers")}</p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <div className="w-6 h-6 rounded-full bg-frame-gray-3 flex items-center justify-center text-[0.62rem] font-frame-mono">
                        {(m.name || m.email)[0].toUpperCase()}
                      </div>
                      <span className="truncate">{m.name || m.email}</span>
                      {m.role === "admin" && <span className="text-frame-orange text-[0.6rem] font-frame-mono uppercase">{t("app.admin.adminTitle")}</span>}
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setLocation(`/project/${projectId}/collaborators`)}
                className="w-full mt-3 text-xs font-frame-mono tracking-wider text-frame-gray-light hover:text-frame-white transition border border-dashed border-frame-gray-3 py-2 flex items-center justify-center gap-1"
              >
                <Users className="w-3 h-3" />
                {t("app.projectHub.inviteMember")}
              </button>
            </div>

            {/* Project Export */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <h3 className="font-frame-mono text-xs tracking-[0.15em] uppercase mb-3">{t("app.projectHub.exportProject")}</h3>
              <p className="text-[0.6rem] text-frame-gray-light mb-3">{t("app.projectHub.exportProjectDescription")}</p>
              <button
                type="button"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = `/api/export/projects/${projectId}`;
                  a.click();
                }}
                className="w-full font-frame-mono text-xs tracking-wider text-frame-white border border-frame-gray-3 py-2 hover:bg-frame-gray-2 transition flex items-center justify-center gap-1"
              >
                <ArrowRight className="w-3 h-3" />
                {t("app.projectHub.export")}
              </button>
            </div>
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
