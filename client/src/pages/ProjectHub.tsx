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
  { slug: "briefing", label: "Briefing" },
  { slug: "roteiro", label: "Roteiro" },
  { slug: "decupagem", label: "Decupagem" },
  { slug: "callsheet", label: "Callsheet" },
  { slug: "orcamento", label: "Orçamento" },
  { slug: "moodboard", label: "Moodboard" },
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
        else toast.error("Projeto não encontrado");
        if (colRes.success) setMembers(colRes.data || []);
        if (filesRes.success) setRecentFiles((filesRes.data?.files || filesRes.data || []).slice(0, 5));
        if (reviewsRes.success) setRecentReviews((reviewsRes.data || []).slice(0, 5));
        setPopulatedStates((statesRes || []).map((state) => state.toolId));
      })
      .catch(() => toast.error("Erro ao carregar projeto"))
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
          <p className="frame-label">Projeto não encontrado</p>
          <button type="button" onClick={() => setLocation("/dashboard")} className="frame-btn-ghost text-xs">
            Voltar ao painel
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
      <main className="max-w-7xl w-full mx-auto px-6 py-8 flex-1">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-frame-gray-3">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="min-w-0">
              <p className="frame-label mb-2">// Projeto #{project.id}</p>
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-frame-white">{project.name}</h1>
                <span className="font-frame-mono text-[0.55rem] tracking-[0.14em] uppercase text-frame-orange border border-frame-orange/30 bg-frame-orange/[0.08] px-2 py-1">
                  {metadata.projectType || project.status || "Ativo"}
                </span>
              </div>
              {project.description && (
                <p className="text-frame-gray-light text-sm mt-1 max-w-2xl leading-relaxed">{project.description}</p>
              )}
              {metadata.objective && (
                <div className="mt-4 border-l-2 border-frame-orange pl-4 max-w-2xl">
                  <span className="block font-frame-mono text-[0.52rem] tracking-[0.14em] uppercase text-frame-gray-light mb-1">
                    Objetivo
                  </span>
                  <p className="text-sm text-frame-white leading-relaxed">{metadata.objective}</p>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-4 font-frame-mono text-[0.55rem] text-frame-gray-light tracking-wider">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  Criado {new Date(createdAt).toLocaleDateString("pt-BR")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Atualizado {new Date(updatedAt).toLocaleDateString("pt-BR")}
                </span>
                {metadata.deadline && (
                  <span className="flex items-center gap-1.5 text-frame-orange">
                    <Target className="w-3 h-3" />
                    Prazo {new Date(`${metadata.deadline}T00:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>

            <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4 w-full lg:w-[300px] shrink-0">
              <div className="flex items-center justify-between mb-3">
                <span className="font-frame-mono text-[0.55rem] tracking-[0.15em] uppercase text-frame-gray-light">
                  Progresso
                </span>
                <strong className="text-frame-white">{progress}%</strong>
              </div>
              <div className="h-2 bg-frame-gray-2 border border-frame-gray-3 overflow-hidden mb-4">
                <div className="h-full bg-frame-orange transition-all" style={{ width: `${progress}%` }} />
              </div>
              <button
                type="button"
                onClick={() => setLocation(`/project/${projectId}/studio/${nextStep.slug}`)}
                className="w-full frame-btn-primary !py-2.5 !px-4 !text-[0.6rem] flex items-center justify-center gap-2"
              >
                Continuar {nextStep.label}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
            <span className="font-frame-mono text-[0.52rem] tracking-[0.14em] uppercase text-frame-gray-light">Arquivos</span>
            <strong className="block text-2xl text-frame-white mt-2">{recentFiles.length}</strong>
          </div>
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
            <span className="font-frame-mono text-[0.52rem] tracking-[0.14em] uppercase text-frame-gray-light">Aprovações</span>
            <strong className="block text-2xl text-frame-white mt-2">{recentReviews.length}</strong>
          </div>
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
            <span className="font-frame-mono text-[0.52rem] tracking-[0.14em] uppercase text-frame-gray-light">Pendências</span>
            <strong className="block text-2xl text-frame-white mt-2">{pendingReviews}</strong>
          </div>
          <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-4">
            <span className="font-frame-mono text-[0.52rem] tracking-[0.14em] uppercase text-frame-gray-light">Equipe</span>
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
                  Fluxo do Projeto
                </h2>
                <span className="font-frame-mono text-[0.55rem] text-frame-gray-light tracking-wider">
                  {completedSteps.length}/{WORKFLOW_STEPS.length} etapas
                </span>
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
                          <span className="font-frame-mono text-[0.48rem] tracking-[0.12em] uppercase text-frame-orange">
                            Próximo
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Quick Access Tools */}
            <section className="space-y-4">
              <h2 className="font-frame-mono text-sm tracking-[0.15em] uppercase text-frame-white font-semibold">
                Ferramentas
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
                      <span className="block text-[0.5rem] font-frame-mono text-frame-gray-light tracking-wider mt-1">
                        ABRIR →
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
                ABRIR STUDIO COMPLETO →
              </button>
            </section>

            {/* Recent Files */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-frame-gray-3 pb-2.5">
                <h2 className="font-frame-mono text-sm tracking-[0.15em] uppercase text-frame-white font-semibold flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-frame-gray-light" />
                  Arquivos Recentes
                </h2>
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/files`)}
                  className="text-[0.55rem] font-frame-mono text-frame-orange hover:text-frame-white transition tracking-wider"
                >
                  VER TODOS →
                </button>
              </div>
              {recentFiles.length === 0 ? (
                <p className="text-xs text-frame-gray-light italic">Nenhum arquivo neste projeto.</p>
              ) : (
                <div className="border border-frame-gray-3 divide-y divide-frame-gray-3">
                  {recentFiles.map((f) => (
                    <div key={f.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                      <span className="text-frame-gray-light">{f.name || f.original_name || "Arquivo sem nome"}</span>
                      <span className="text-[0.5rem] font-frame-mono text-frame-gray-light uppercase ml-auto">
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
                  Aprovações de Vídeo
                </h2>
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/video-reviews`)}
                  className="text-[0.55rem] font-frame-mono text-frame-orange hover:text-frame-white transition tracking-wider"
                >
                  VER TODOS →
                </button>
              </div>
              {recentReviews.length === 0 ? (
                <p className="text-xs text-frame-gray-light italic">Nenhuma aprovação neste projeto.</p>
              ) : (
                <div className="border border-frame-gray-3 divide-y divide-frame-gray-3">
                  {recentReviews.map((r) => (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-3 text-sm">
                      <span className="text-frame-white">{r.title}</span>
                      <span className={`text-[0.5rem] font-frame-mono uppercase ml-auto px-1.5 py-0.5 border ${
                        r.status === "approved" ? "border-green-500/30 text-green-400" :
                        r.status === "rejected" ? "border-red-500/30 text-red-400" :
                        r.status === "pending_review" ? "border-yellow-500/30 text-yellow-400" :
                        "border-frame-gray-3 text-frame-gray-light"
                      }`}>
                        {r.status === "approved" ? "Aprovado" :
                         r.status === "rejected" ? "Rejeitado" :
                         r.status === "pending_review" ? "Pendente" : r.status}
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
                Direção Criativa
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="block font-frame-mono text-[0.5rem] tracking-[0.12em] uppercase text-frame-gray-light mb-1">
                    Cliente
                  </span>
                  <p className="text-frame-white">{metadata.creativeGoals?.client || "Não definido"}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block font-frame-mono text-[0.5rem] tracking-[0.12em] uppercase text-frame-gray-light mb-1">
                      Formato
                    </span>
                    <p className="text-frame-white">{metadata.creativeGoals?.format || "Aberto"}</p>
                  </div>
                  <div>
                    <span className="block font-frame-mono text-[0.5rem] tracking-[0.12em] uppercase text-frame-gray-light mb-1">
                      Tom
                    </span>
                    <p className="text-frame-white">{metadata.creativeGoals?.tone || "Aberto"}</p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLocation(`/project/${projectId}/studio/briefing`)}
                className="w-full mt-4 text-xs font-frame-mono tracking-wider text-frame-gray-light hover:text-frame-white transition border border-dashed border-frame-gray-3 py-2 flex items-center justify-center gap-1"
              >
                <FileText className="w-3 h-3" />
                EDITAR BRIEFING
              </button>
            </div>

            {/* Members */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-frame-mono text-xs tracking-[0.15em] uppercase flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-frame-gray-light" />
                  Equipe
                </h3>
                <button
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/collaborators`)}
                  className="text-[0.5rem] font-frame-mono text-frame-orange hover:text-frame-white transition"
                >
                  GERENCIAR →
                </button>
              </div>
              {members.length === 0 ? (
                <p className="text-xs text-frame-gray-light italic">Nenhum membro.</p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-2 text-xs">
                      <div className="w-6 h-6 rounded-full bg-frame-gray-3 flex items-center justify-center text-[0.5rem] font-frame-mono">
                        {(m.name || m.email)[0].toUpperCase()}
                      </div>
                      <span className="truncate">{m.name || m.email}</span>
                      {m.role === "admin" && <span className="text-frame-orange text-[0.4rem] font-frame-mono uppercase">Admin</span>}
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
                CONVIDAR MEMBRO
              </button>
            </div>

            {/* Project Export */}
            <div className="border border-frame-gray-3 bg-frame-gray-1/10 p-4">
              <h3 className="font-frame-mono text-xs tracking-[0.15em] uppercase mb-3">Exportar Projeto</h3>
              <p className="text-[0.6rem] text-frame-gray-light mb-3">Baixe todo o projeto em formato portátil.</p>
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
                EXPORTAR
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
