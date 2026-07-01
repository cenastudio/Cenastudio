import AppNavBar from "@/components/AppNavBar";
import ProjectNav from "@/components/ProjectNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api, type Project } from "@/lib/api";
import { getWorkflowStage, isActionComplete } from "@/lib/workflow";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useProject } from "@/contexts/ProjectContext";
import { toast } from "sonner";

function ProjectChapterContent() {
  const [, params] = useRoute("/project/:projectId/journey/:stage");
  const [, setLocation] = useLocation();
  const { updateProject } = useProject();
  const projectId = Number(params?.projectId || 0);
  const stage = getWorkflowStage(params?.stage);
  const [project, setProject] = useState<Project | null>(null);
  const [states, setStates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([api.projects.get(projectId), api.projects.populatedStates(projectId)])
      .then(([loadedProject, loadedStates]) => {
        setProject(loadedProject);
        setStates(loadedStates.map((item) => item.toolId));
      })
      .finally(() => setLoading(false));
  }, [projectId, stage.id]);

  useEffect(() => {
    if (!project) return;
    let metadata: Record<string, unknown> = {};
    try { metadata = JSON.parse(project.metadataJson || "{}"); } catch { metadata = {}; }
    if (metadata.workflowStage === stage.id) return;
    const nextMetadata = JSON.stringify({ ...metadata, workflowStage: stage.id });
    updateProject(project.id, { metadataJson: nextMetadata })
      .then((updated) => setProject(updated))
      .catch(() => null);
  }, [project?.id, stage.id]);

  const completed = stage.actions.filter((action) => isActionComplete(action, states)).length;
  const firstPending = stage.actions.find((action) => !isActionComplete(action, states)) || stage.actions[0];
  const stageIndex = ["entry", "planning", "production", "review", "delivery", "closing"].indexOf(stage.id);
  const previous = stageIndex > 0 ? ["entry", "planning", "production", "review", "delivery", "closing"][stageIndex - 1] : null;
  const next = stageIndex < 5 ? ["entry", "planning", "production", "review", "delivery", "closing"][stageIndex + 1] : null;

  const finishProject = async () => {
    if (!project) return;
    const updated = await updateProject(project.id, { status: "completed" });
    setProject(updated);
    toast.success("Projeto concluído. A história e seus artefatos permanecem disponíveis.");
  };

  if (loading) return <div className="min-h-screen bg-frame-black text-frame-white flex items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-frame-orange" /></div>;

  return (
    <div className="min-h-screen bg-frame-black text-frame-white">
      <AppNavBar />
      <ProjectNav projectId={projectId} />
      <main id="main-content" className="mx-auto w-full max-w-7xl space-y-7 px-4 py-8 sm:px-6 md:py-12">
        <header className="grid gap-6 border-b border-frame-gray-3 pb-7 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-end">
          <div>
            <p className="frame-label mb-2">// Capítulo {stage.number} · {project?.name}</p>
            <p className="font-frame-mono text-[0.62rem] uppercase tracking-[0.18em] text-frame-orange">{stage.eyebrow}</p>
            <h1 className="mt-2 frame-title text-[clamp(2.2rem,5vw,4.6rem)]">{stage.label}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-frame-gray-light">{stage.description}</p>
          </div>
          <div className="border border-frame-orange/35 bg-frame-orange/[0.05] p-4">
            <div className="flex items-center justify-between"><span className="frame-label">Progresso do capítulo</span><strong>{completed}/{stage.actions.length}</strong></div>
            <div className="mt-3 h-2 overflow-hidden border border-frame-gray-3 bg-frame-black"><div className="h-full bg-frame-orange" style={{ width: `${stage.actions.length ? (completed / stage.actions.length) * 100 : 0}%` }} /></div>
            <p className="mt-3 text-xs leading-relaxed text-frame-gray-light">Saída esperada: {stage.outcome}</p>
          </div>
        </header>

        <section className="border border-frame-orange/40 bg-frame-orange/[0.06] p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div><p className="frame-label text-frame-orange">Próximo movimento</p><h2 className="mt-1 text-lg font-semibold">{firstPending.label}</h2><p className="mt-1 text-xs text-frame-gray-light">{firstPending.description}</p></div>
          <button type="button" onClick={() => setLocation(firstPending.route(projectId))} className="frame-btn-primary mt-4 flex items-center justify-center gap-2 sm:mt-0">Continuar <ArrowRight className="h-4 w-4" /></button>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {stage.actions.map((action, index) => {
            const done = isActionComplete(action, states);
            const Icon = done ? CheckCircle2 : Circle;
            return (
              <button key={action.id} type="button" onClick={() => setLocation(action.route(projectId))} className="group min-h-[180px] border border-frame-gray-3 bg-frame-gray-1/20 p-5 text-left transition hover:border-frame-orange/60">
                <div className="flex items-center justify-between"><span className="font-frame-mono text-[0.58rem] text-frame-orange">{String(index + 1).padStart(2, "0")}</span><Icon className={`h-4 w-4 ${done ? "text-emerald-400" : "text-frame-gray-light"}`} /></div>
                <h3 className="mt-7 text-lg font-semibold group-hover:text-frame-orange">{action.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-frame-gray-light">{action.description}</p>
              </button>
            );
          })}
        </section>

        <footer className="flex items-center justify-between border-t border-frame-gray-3 pt-5">
          <button type="button" disabled={!previous} onClick={() => previous && setLocation(`/project/${projectId}/journey/${previous}`)} className="frame-btn-ghost flex items-center gap-2 disabled:opacity-30"><ArrowLeft className="h-4 w-4" /> Capítulo anterior</button>
          <button type="button" disabled={!next} onClick={() => next && setLocation(`/project/${projectId}/journey/${next}`)} className="frame-btn-ghost flex items-center gap-2 disabled:opacity-30">Próximo capítulo <ArrowRight className="h-4 w-4" /></button>
        </footer>
        {stage.id === "closing" && project && (
          <section className="flex flex-col gap-4 border border-frame-orange/45 bg-frame-orange/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="frame-label text-frame-orange">Última decisão</p><h2 className="mt-1 text-lg font-semibold">{project.status === "completed" ? "Projeto concluído" : "Encerrar este job"}</h2><p className="mt-1 text-xs text-frame-gray-light">Concluir preserva todo o histórico e remove o job da fila de ativos.</p></div>
            <button type="button" disabled={project.status === "completed"} onClick={() => void finishProject()} className="frame-btn-primary disabled:opacity-50">{project.status === "completed" ? "História concluída" : "Concluir projeto"}</button>
          </section>
        )}
      </main>
    </div>
  );
}

export default function ProjectChapter() {
  return <ProtectedRoute><ProjectChapterContent /></ProtectedRoute>;
}
