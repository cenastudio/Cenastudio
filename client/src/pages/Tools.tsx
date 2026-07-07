import AppNavBar from "@/components/AppNavBar";
import { api } from "@/lib/api";
import { getToolIcon } from "@/lib/toolIcons";
import { localizeTools } from "@/lib/toolTranslations";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { ToolFromApi } from "@/lib/api";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStageForTool, WORKFLOW_STAGES } from "@/lib/workflow";

const TOOL_FOCUS: Record<string, { phase: string; outcome: string; critical?: boolean }> = {
  briefing: { phase: "01 Descoberta", outcome: "Base para roteiro, proposta e contrato.", critical: true },
  orcamento: { phase: "02 Comercial", outcome: "Premissas de custo e margem.", critical: true },
  proposta: { phase: "03 Fechamento", outcome: "Documento comercial para aceite.", critical: true },
  contrato: { phase: "04 Proteção", outcome: "Minuta para revisão jurídica.", critical: true },
  entrega: { phase: "05 Fechamento", outcome: "Pacote final e aceite do cliente.", critical: true },
  roteiro: { phase: "Pré-produção", outcome: "Narrativa pronta para decupagem." },
  decupagem: { phase: "Direção", outcome: "Planos, lentes e movimentos." },
  callsheet: { phase: "Produção", outcome: "Dia de set organizado." },
  cronograma: { phase: "Gestão", outcome: "Marcos e dependências." },
  moodboard: { phase: "Direção visual", outcome: "Look, referências e tom." },
  checklist: { phase: "Set", outcome: "Conferência de técnica e produção." },
  assistente: { phase: "Apoio", outcome: "Resposta livre para decisões do job." },
};

function ToolsContent({ embedded }: { embedded?: boolean }) {
  const { locale, t } = useLanguage();
  const [, setLocation] = useLocation();
  const [tools, setTools] = useState<ToolFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeProject } = useProject();
  const localizedTools = localizeTools(tools, locale);
  const openToolPath = (tool: ToolFromApi) => (
    activeProject ? `/project/${activeProject.id}/studio/${tool.slug || tool.id}` : `/studio/${tool.slug || tool.id}`
  );

  useEffect(() => {
    api.tools
      .list()
      .then(setTools)
      .catch((e) => setError(e instanceof Error ? e.message : t("app.errors.loadTools")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={`app-glass-surface tools-glass-page ${embedded ? "" : "min-h-screen"} text-frame-white`}>
      {!embedded && <AppNavBar />}

      <section className="px-4 sm:px-6 md:px-12 py-10 md:py-16">
        <div className="mb-8 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
          <div>
            <p className="frame-label mb-3">// {t("app.tools.allTools")}</p>
            <h1 className="frame-title text-[clamp(2.3rem,4.3vw,3.8rem)] text-frame-white">
              ORGANIZE O JOB <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">COM IA</em>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-frame-gray-light">
              {t("app.tools.pageDescription") as string}
            </p>
            <div className={`mt-5 border p-3 ${activeProject ? "border-frame-orange/35 bg-frame-orange/[0.06]" : "border-frame-gray-3 bg-frame-gray-1/20"}`}>
              <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">
                {activeProject ? "Modo projeto ativo" : "Biblioteca sem job ativo"}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-frame-gray-light">
                {activeProject
                  ? `As ferramentas abrem dentro de "${activeProject.name}" para salvar histórico, contexto e versões no job.`
                  : "Escolha uma ferramenta para trabalhar solto ou abra um projeto para conectar IA, documentos e histórico."}
              </p>
            </div>
          </div>

          <div className="border border-frame-orange/30 bg-frame-orange/5 p-4">
            <p className="font-frame-mono text-[0.6rem] uppercase tracking-[0.16em] text-frame-orange">Escolha pelo momento do job</p>
            <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-3">
              {WORKFLOW_STAGES.filter((stage) => stage.actions.some((action) => action.toolId)).map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setLocation(activeProject ? `/project/${activeProject.id}/journey/${stage.id}` : `/tools#${stage.id}`)}
                  className="border border-frame-gray-3 bg-frame-black/30 px-3 py-2 text-left transition hover:border-frame-orange/50"
                >
                  <span className="block font-frame-mono text-[0.52rem] text-frame-orange">{stage.number}</span>
                  <span className="mt-1 block text-[0.72rem] font-semibold text-frame-white">{stage.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <p className="font-frame-mono text-[0.65rem] tracking-[0.15em] uppercase text-frame-gray-light">
            {t("app.common.loading")}
          </p>
        )}
        {error && <p className="text-frame-red font-frame-mono text-sm">{error}</p>}

        <div className="space-y-10">
          {WORKFLOW_STAGES.map((stage) => {
            const stageTools = localizedTools.filter((tool) => getStageForTool(tool.slug) === stage.id);
            if (!stageTools.length) return null;
            return (
              <section key={stage.id} id={stage.id} className="scroll-mt-24">
                <header className="mb-4 flex flex-col gap-2 border-b border-frame-gray-3 pb-3 sm:flex-row sm:items-end sm:justify-between">
                  <div><p className="frame-label">// Capítulo {stage.number}</p><h2 className="mt-1 text-xl font-semibold">{stage.label}</h2></div>
                  <p className="max-w-xl text-xs leading-relaxed text-frame-gray-light">{stage.description}</p>
                </header>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:gap-4">
                  {stageTools.map((tool) => {
                    const Icon = getToolIcon(tool.slug);
                    const focus = TOOL_FOCUS[tool.slug];
                    return (
                      <div key={tool.id} className={`frame-card cursor-pointer group ${focus?.critical ? "border-frame-orange/35" : ""}`} onClick={() => setLocation(openToolPath(tool))}>
                        <Icon className="w-7 h-7 mb-3.5 text-frame-gray-light grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-300" />
                        <p className="font-frame-mono text-[0.64rem] tracking-[0.2em] text-frame-orange mb-2">{focus?.critical ? "SESSÃO DEDICADA" : focus?.phase || tool.id}</p>
                        <h3 className="frame-title text-[1.45rem] text-frame-white mb-2">{tool.name}</h3>
                        <p className="text-[0.8rem] leading-relaxed text-frame-gray-light font-light mb-4 line-clamp-3">{tool.description}</p>
                        {focus && <p className="mb-4 border-l-2 border-frame-orange/55 pl-3 text-[0.68rem] leading-relaxed text-frame-gray-light">{focus.outcome}</p>}
                        <div className="flex flex-wrap gap-1 mb-4">{tool.tags.slice(0, 3).map((tag) => <span key={tag} className="frame-tag">{tag}</span>)}</div>
                        <button type="button" className="frame-btn-ghost w-full !min-h-10 !py-2 !px-3.5 text-center transition group-hover:border-frame-orange/60 group-hover:text-frame-white" onClick={(event) => { event.stopPropagation(); setLocation(openToolPath(tool)); }}>{activeProject ? "Abrir neste job" : t("app.tools.openInStudio")} →</button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function Tools({ embedded }: { embedded?: boolean }) {
  if (embedded) return <ToolsContent embedded />;
  return (
    <ProtectedRoute>
      <ToolsContent />
    </ProtectedRoute>
  );
}
