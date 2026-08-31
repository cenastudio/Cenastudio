import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { api, ApiError, startCheckout, type ToolFromApi } from "@/lib/api";
import { useClientIdFromQuery } from "@/hooks/useClientIdFromQuery";
import { cleanGeneratedText, downloadGeneratedDocx, downloadGeneratedPdf } from "@/lib/documentFormatter";
import { toast } from "sonner";
import ToolSidebar from "./ToolSidebar";
import ToolWorkspace from "./ToolWorkspace";
import OutputPanel from "./OutputPanel";
import HistoryPanel from "./HistoryPanel";
import AppNavBar from "../AppNavBar";
import { Loader2, Bot, ClipboardList, FileCheck2, FolderKanban, Sparkles, Wand2 } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { TOOLS } from "../../../../shared/tools";
import ProjectTimeline from "./ProjectTimeline";
import AssistantChatWorkspace from "./AssistantChatWorkspace";
import {
  buildStudioLinkedContext,
  countFillableFields,
  mergeStudioPrefill,
  type StudioLinkedContext,
} from "@/lib/studioContext";
import { getArtifactStatus, getArtifactVersion, type ArtifactStatus, visibleFormValues } from "@/lib/workflow";

const fallbackTools: ToolFromApi[] = TOOLS.map((tool) => ({
  id: tool.id,
  slug: tool.slug,
  name: tool.name,
  description: tool.description,
  category: tool.category,
  icon: tool.icon,
  tags: tool.tags,
  processingTime: tool.processingTime,
  placeholder: tool.placeholder,
  isActive: true,
}));

export default function StudioShell() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/studio/:id");
  const [, projectParams] = useRoute("/project/:projectId/studio/:id");

  // Project Context
  const {
    activeProject,
    fetchToolState,
    triggerAutosave,
    saveToolStateImmediately,
    selectProject,
  } = useProject();

  const projectIdParam = projectParams?.projectId;
  const activeToolId = params?.id || projectParams?.id || "";
  const clientIdParam = useClientIdFromQuery();

  // Local States
  const [tools, setTools] = useState<ToolFromApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024,
  );
  const [linkedContext, setLinkedContext] = useState<StudioLinkedContext | null>(null);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem("cena-ai-model") || "");
  const [commercialDraft, setCommercialDraft] = useState<{ clientId: number; reused: boolean } | null>(null);

  // Listen for model changes from ContextPanel
  useEffect(() => {
    const handler = (e: Event) => setSelectedModel((e as CustomEvent).detail || "");
    window.addEventListener("cena:model-change", handler);
    return () => window.removeEventListener("cena:model-change", handler);
  }, []);

  const tool =
    tools.find((t) => t.id === activeToolId || t.slug === activeToolId) ||
    fallbackTools.find((t) => t.id === activeToolId || t.slug === activeToolId);
  const { t, locale } = useLanguage();

  // Sync active project state from URL parameters
  useEffect(() => {
    if (projectIdParam) {
      selectProject(Number(projectIdParam));
    } else {
      selectProject(null);
    }
  }, [projectIdParam]);

  // Load tools list on mount
  useEffect(() => {
    api.tools.list()
      .then((data) => {
        const activeTools = data.length > 0 ? data : fallbackTools;
        setTools(activeTools);
        // If no tool selected, redirect to the first active tool
        if (!activeToolId && activeTools.length > 0) {
          const firstTool = activeTools.find((t) => t.isActive) || activeTools[0];
          const path = projectIdParam
            ? `/project/${projectIdParam}/studio/${firstTool.id}`
            : `/studio/${firstTool.id}`;
          setLocation(path);
        }
      })
      .catch(() => {
        setTools(fallbackTools);
        if (!activeToolId) {
          const firstTool = fallbackTools[0];
          const path = projectIdParam
            ? `/project/${projectIdParam}/studio/${firstTool.id}`
            : `/studio/${firstTool.id}`;
          setLocation(path);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeToolId, projectIdParam, setLocation]);

  // Reset or load tool inputs/output when selected tool changes or project changes
  useEffect(() => {
    let cancelled = false;
    if (activeProject && tool) {
      fetchToolState(tool.id).then(async (state) => {
        if (cancelled) return;
        let nextLinkedContext = buildStudioLinkedContext(tool.slug, activeProject);
        if (activeProject.clientId) {
          try {
            const details = await api.clients.get(activeProject.clientId);
            if (cancelled) return;
            nextLinkedContext = buildStudioLinkedContext(tool.slug, activeProject, details.client);
          } catch {
            nextLinkedContext = buildStudioLinkedContext(tool.slug, activeProject);
          }
        }
        if (cancelled) return;
        setLinkedContext(nextLinkedContext);

        if (state) {
          setFormData(state.formData || {});
          setOutput(state.outputData || "");
        } else {
          const { merged } = mergeStudioPrefill({}, nextLinkedContext?.prefill || {});
          setFormData(merged);
          setOutput("");
        }
      });
    } else {
      setLinkedContext(null);
      setFormData({});
      setOutput("");
    }
    setError(null);
    setLimitReached(false);
    return () => {
      cancelled = true;
    };
  }, [activeToolId, activeProject, tool?.id, tool?.slug]);

  // Inject client context from ?clientId query param when no active project
  useEffect(() => {
    if (clientIdParam && !activeProject) {
      api.clients.get(clientIdParam).then((details) => {
        let ctx = buildStudioLinkedContext(activeToolId, null, details.client);
        setLinkedContext(ctx);
        const { merged } = mergeStudioPrefill({}, ctx?.prefill || {});
        setFormData(merged);

        // Offer active project context when client has non-archived/non-cancelled projects
        const activeProjects = (details.projects ?? []).filter(
          (p: any) => !["archived", "cancelled"].includes(p.status)
        );
        if (activeProjects.length > 0) {
          const latestProject = [...activeProjects].sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];
          if (ctx) {
            ctx = { ...ctx, sourceLabel: `${details.client.name} → ${latestProject.name}` };
            setLinkedContext(ctx);
          }
        }
      }).catch(() => { /* graceful no-op */ });
    }
  }, [clientIdParam, activeToolId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-frame-orange" />
        <p className="font-frame-mono text-xs tracking-widest text-frame-gray-light">{t("app.studio.loading") as string}</p>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-frame-black text-frame-white">
        <AppNavBar />
        <main className="mx-auto flex min-h-[70vh] max-w-4xl flex-col justify-center px-4 py-10">
          <section className="border border-frame-gray-3/70 bg-frame-gray-1/20 p-6 sm:p-8">
            <p className="font-frame-mono text-[0.62rem] uppercase tracking-[0.16em] text-frame-orange">
              Studio IA / ferramenta indisponível
            </p>
            <h1 className="mt-3 frame-title text-[clamp(2rem,5vw,3.5rem)] leading-none text-frame-white">
              Escolha uma ferramenta ativa.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-frame-gray-light">
              A rota atual não encontrou uma ferramenta válida. Volte para a biblioteca ou abra a primeira ferramenta de produção para continuar no mesmo fluxo.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setLocation("/tools")}
                className="frame-btn-ghost min-h-11"
              >
                {t("app.studio.backToTools") as string}
              </button>
              <button
                type="button"
                onClick={() => setLocation("/studio/01")}
                className="frame-btn-primary min-h-11"
              >
                Abrir roteiro
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  // Handle value change for form fields
  const handleChangeField = (key: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      if (activeProject && tool) {
        triggerAutosave(tool.id, updated, output);
      }
      return updated;
    });
  };

  const handleApplyLinkedContext = () => {
    if (!tool || !linkedContext) return;
    const { merged, applied } = mergeStudioPrefill(formData, linkedContext.prefill);
    if (!applied) {
      toast.info(t("app.studio.linkedContextNoEmpty") as string);
      return;
    }
    setFormData(merged);
    if (activeProject) {
      saveToolStateImmediately(tool.id, merged, output);
    }
    toast.success(t("app.studio.linkedContextApplied") as string);
  };

  // Execute AI generation
  const handleExecute = async () => {
    if (!tool) return;

    // Check if we have at least some input
    const values = visibleFormValues(formData);
    if (values.length === 0) {
      toast.error(t("app.studio.fillRequiredFields") as string);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setLimitReached(false);

    try {
      const result = await api.ai.generate(tool.id, formData, activeProject?.id, selectedModel || undefined);
      setOutput(result.output);
      toast.success(t("app.studio.generationComplete") as string);
      setCommercialDraft(null);
      if (activeProject) {
        const nextForm = {
          ...formData,
          __artifactStatus: "draft",
          __artifactVersion: String(output ? getArtifactVersion(formData) + 1 : getArtifactVersion(formData)),
        };
        setFormData(nextForm);
        saveToolStateImmediately(tool.id, nextForm, result.output);

        if (tool.id === "05") {
          try {
            const draft = await api.proposals.createDraftFromBudget(activeProject.id, result.generationId, "ai-budget");
            setCommercialDraft({ clientId: draft.client_id, reused: draft.reused });
          } catch (draftError) {
            const message = draftError instanceof Error ? draftError.message : "";
            toast.info(message || (locale === "en"
              ? "The AI proposal was saved. Link a client and project budget to create its commercial draft."
              : "A proposta da IA foi salva. Vincule cliente e orçamento ao projeto para criar o rascunho comercial."));
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("app.studio.generationError") as string;
      const isLimit =
        (e instanceof ApiError && e.status === 403) || msg.toLowerCase().includes("limite");

      if (isLimit) {
        setLimitReached(true);
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy output to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(cleanGeneratedText(output));
    toast.success(t("app.studio.cleanCopied") as string);
  };

  const handleDownload = async (format: "pdf" | "docx") => {
    try {
      if (format === "pdf") await downloadGeneratedPdf(output, tool.name, locale);
      else await downloadGeneratedDocx(output, tool.name, locale);
      toast.success(format === "pdf" ? t("app.studio.pdfGenerated") as string : t("app.studio.wordGenerated") as string);
    } catch {
      toast.error(t("app.studio.documentError") as string);
    }
  };

  // Clear current form and output
  const handleClear = () => {
    setFormData({});
    setOutput("");
    setError(null);
    setLimitReached(false);
    if (activeProject && tool) {
      saveToolStateImmediately(tool.id, {}, "");
    }
    toast.success(t("app.studio.workspaceCleared") as string);
  };

  // Restore previous generation state from history panel
  const handleRestore = (input: Record<string, string>, outputText: string) => {
    setFormData(input);
    setOutput(outputText);
    setError(null);
    setLimitReached(false);
    setHistoryOpen(false);
    if (activeProject && tool) {
      saveToolStateImmediately(tool.id, input, outputText);
    }
  };

  const handleArtifactStatusChange = (status: ArtifactStatus) => {
    if (!activeProject || !tool) return;
    const nextForm = { ...formData, __artifactStatus: status, __artifactVersion: String(getArtifactVersion(formData)) };
    setFormData(nextForm);
    saveToolStateImmediately(tool.id, nextForm, output);
    toast.success(`Artefato marcado como ${status === "draft" ? "rascunho" : status === "review" ? "em revisão" : status === "approved" ? "aprovado" : "arquivado"}.`);
  };

  const handleSelectTool = (id: string) => {
    const path = projectIdParam
      ? `/project/${projectIdParam}/studio/${id}`
      : `/studio/${id}`;
    setLocation(path);
  };

  const filledFieldsCount = visibleFormValues(formData).length;
  const artifactStatus = getArtifactStatus(formData);
  const artifactVersion = getArtifactVersion(formData);
  const studioActionLabels: Record<string, string> = {
    briefing: "Montar Briefing",
    roteiro: "Escrever Roteiro",
    decupagem: "Criar Decupagem",
    orcamento: "Gerar Orçamento",
    proposta: "Criar Proposta",
    contrato: "Preparar Contrato",
    callsheet: "Montar Callsheet",
    cronograma: "Planejar Cronograma",
    checklist: "Criar Checklist",
    entrega: "Preparar Entrega",
    moodboard: "Gerar Direção Visual",
  };
  const studioActionLabel = studioActionLabels[tool.slug] || "Gerar Peça";

  return (
    <div className="studio-app min-h-screen bg-frame-black text-frame-white flex flex-col">
      <AppNavBar />
      <ProjectTimeline activeToolId={tool.slug} />

      {/* The Studio scrolls as one page on every breakpoint. Internal locked
          panes were fragile in Safari and made long forms feel broken. */}
      <div className="studio-workbench flex flex-1 flex-col lg:flex-row">
        <div className={`overflow-hidden shrink-0 transition-[height,width,max-height] duration-200 ${sidebarCollapsed ? "h-0 lg:h-auto lg:w-0" : "w-auto max-h-[40vh] lg:max-h-none"}`}>
          <div className="h-full overflow-y-auto">
            <ToolSidebar
              tools={tools}
              activeToolId={tool.id}
              onSelectTool={handleSelectTool}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="flex min-h-11 w-full shrink-0 items-center justify-center gap-2 border-b border-frame-gray-2 px-3 transition-colors hover:bg-frame-white/[0.03] lg:hidden"
          title={sidebarCollapsed ? "Mostrar ferramentas" : "Esconder ferramentas"}
        >
          <Wand2 className="h-4 w-4 text-frame-orange" aria-hidden="true" />
          <span className="font-frame-mono text-[0.62rem] uppercase tracking-[0.12em] text-frame-gray-light">
            {sidebarCollapsed ? "Mostrar oficina de IA" : "Recolher oficina de IA"}
          </span>
        </button>

        <div className="studio-main flex-1 flex flex-col relative">
          {tool.slug !== "assistente" && (
            <section className="studio-command-deck shrink-0 border-b border-frame-gray-3/70 bg-[radial-gradient(circle_at_18%_0%,rgba(var(--ds-orange-rgb),0.18),transparent_34%),linear-gradient(135deg,rgba(18,18,18,0.96),rgba(7,7,7,0.98))] px-4 py-5 sm:px-6 lg:px-8">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.62fr)] xl:items-end">
                <div className="min-w-0">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--ds-radius-control)] border border-frame-orange/35 bg-frame-orange/[0.1] shadow-[0_0_28px_rgba(var(--ds-orange-rgb),0.12)]">
                      <Bot className="h-5 w-5 text-frame-orange" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">
                        Studio IA / Oficina de produção
                      </p>
                      <p className="mt-0.5 truncate text-xs text-frame-gray-light">
                        {activeProject ? activeProject.name : "Biblioteca sem projeto ativo"}
                      </p>
                    </div>
                  </div>
                  <h1 className="frame-title max-w-4xl text-[2.15rem] leading-none text-frame-white text-balance sm:text-[clamp(2.7rem,4vw,4rem)]">
                    {tool.name}
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-relaxed text-frame-gray-light text-pretty sm:text-base">
                    Transforme contexto real do job em uma peça de produção pronta para revisar, exportar ou levar ao próximo módulo.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    {
                      label: "Contexto",
                      value: linkedContext ? "Conectado" : "Manual",
                      detail: linkedContext?.sourceLabel || activeProject?.clientName || "sem vínculo",
                      icon: FolderKanban,
                    },
                    {
                      label: "Brief",
                      value: filledFieldsCount,
                      detail: filledFieldsCount > 0 ? "campos preenchidos" : "aguardando entrada",
                      icon: ClipboardList,
                    },
                    {
                      label: "Artefato",
                      value: output ? "Gerado" : artifactStatus,
                      detail: `v${artifactVersion}`,
                      icon: FileCheck2,
                    },
                  ].map(({ label, value, detail, icon: Icon }) => (
                    <div key={label} className="min-w-0 rounded-[var(--ds-radius-control)] border border-frame-gray-3/60 bg-frame-black/35 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-frame-mono text-[0.52rem] uppercase tracking-[0.14em] text-frame-gray-light">{label}</span>
                        <Icon className="h-3.5 w-3.5 shrink-0 text-frame-orange" aria-hidden="true" />
                      </div>
                      <strong className="mt-2 block truncate text-lg leading-none text-frame-white">{value}</strong>
                      <span className="mt-1 block truncate text-[0.65rem] text-frame-gray-light">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`mt-5 grid gap-2 ${linkedContext ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                {linkedContext && (
                  <button
                    type="button"
                    onClick={handleApplyLinkedContext}
                    className="frame-btn-ghost flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-[var(--ds-radius-control)] px-3 text-sm font-semibold normal-case tracking-normal"
                  >
                    <Sparkles className="h-4 w-4 shrink-0 text-frame-orange" aria-hidden="true" />
                    <span className="truncate">Aplicar contexto</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isProcessing}
                  className="frame-btn-primary flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-[var(--ds-radius-control)] px-3 text-sm font-semibold normal-case tracking-normal disabled:opacity-70"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : <Wand2 className="h-4 w-4 shrink-0 text-frame-black" aria-hidden="true" />}
                  <span className="truncate">{output ? "Gerar Nova Versão" : studioActionLabel}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="frame-btn-ghost flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-[var(--ds-radius-control)] px-3 text-sm font-semibold normal-case tracking-normal"
                >
                  <FileCheck2 className="h-4 w-4 shrink-0 text-frame-orange" aria-hidden="true" />
                  <span className="truncate">Ver versões</span>
                </button>
              </div>
            </section>
          )}

          <div className="studio-production-grid grid flex-1 gap-4 p-4 md:p-5 xl:grid-cols-[minmax(360px,0.44fr)_minmax(0,1fr)] xl:gap-5 xl:p-6">
          {tool.slug === "assistente" ? (
            <AssistantChatWorkspace tool={tool} projectId={activeProject?.id} />
          ) : (
            <>
              <div className="min-w-0">
                <ToolWorkspace
                  tool={tool}
                  formData={formData}
                  onChangeField={handleChangeField}
                  onExecute={handleExecute}
                  isProcessing={isProcessing}
                  error={error}
                  linkedContext={linkedContext ? {
                    projectName: linkedContext.projectName,
                    clientName: linkedContext.clientName,
                    availableCount: Object.keys(linkedContext.prefill).length,
                    fillableCount: countFillableFields(formData, linkedContext.prefill),
                    sourceLabel: linkedContext.sourceLabel,
                  } : null}
                  onApplyLinkedContext={handleApplyLinkedContext}
                  onSetOutput={(newOut) => {
                    setOutput(newOut);
                    if (activeProject) {
                      saveToolStateImmediately(tool.id, formData, newOut);
                    }
                  }}
                  actionLabel={output ? "Gerar Nova Versão" : studioActionLabel}
                />
              </div>

              <div className="min-w-0">
                {/* Limit Reached Warning Alert Banner */}
                {limitReached && (
                  <div className="mx-6 mt-4 px-4 py-3 border border-frame-orange/40 bg-frame-orange/[0.08] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                    <p className="font-frame-mono text-[0.63rem] tracking-[0.1em] text-frame-orange">
                      {t("app.studio.limitReached") as string}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="frame-btn-primary !py-1.5 !px-3 !text-[0.64rem]"
                        onClick={async () => {
                          try {
                            await startCheckout("pro");
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : t("app.studio.checkoutError") as string);
                          }
                        }}
                      >
                        {t("app.studio.upgradePro") as string}
                      </button>
                      <button
                        type="button"
                        className="frame-btn-ghost !py-1.5 !px-3 !text-[0.64rem]"
                        onClick={() => {
                          window.location.hash = "pricing";
                        }}
                      >
                        {t("app.studio.viewPlans") as string}
                      </button>
                    </div>
                  </div>
                )}

                {tool.id === "05" && commercialDraft && (
                  <div className="mx-6 mt-4 px-4 py-3 border border-frame-orange/40 bg-frame-orange/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
                    <p className="text-sm text-frame-white">
                      {locale === "en"
                        ? commercialDraft.reused ? "Commercial draft updated from this AI proposal." : "Commercial draft created from this AI proposal."
                        : commercialDraft.reused ? "Rascunho comercial atualizado a partir desta proposta de IA." : "Rascunho comercial criado a partir desta proposta de IA."}
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocation(`/clients/${commercialDraft.clientId}?tab=propostas`)}
                      className="frame-btn-ghost !py-2 !px-3 shrink-0"
                    >
                      {locale === "en" ? "Open commercial record" : "Abrir ficha comercial"}
                    </button>
                  </div>
                )}

                <OutputPanel
                  tool={tool}
                  output={output}
                  projectId={activeProject?.id}
                  onUpdateOutput={(newOut) => {
                    setOutput(newOut);
                    if (activeProject && tool) {
                      saveToolStateImmediately(tool.id, formData, newOut);
                    }
                  }}
                  onClearAll={handleClear}
                  onToggleHistory={() => setHistoryOpen(!historyOpen)}
                  onCopy={handleCopy}
                  onDownload={handleDownload}
                  artifactStatus={getArtifactStatus(formData)}
                  artifactVersion={getArtifactVersion(formData)}
                  onArtifactStatusChange={activeProject ? handleArtifactStatusChange : undefined}
                />
              </div>

              {/* Generation History Sidebar Drawer Panel */}
              <HistoryPanel
                isOpen={historyOpen}
                onClose={() => setHistoryOpen(false)}
                toolId={tool.id}
                projectId={activeProject?.id}
                onRestore={handleRestore}
              />
            </>
          )}

          </div>
        </div>
      </div>
    </div>
  );
}
