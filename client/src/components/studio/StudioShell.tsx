import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { api, ApiError, startCheckout, type ToolFromApi } from "@/lib/api";
import { cleanGeneratedText, downloadGeneratedDocx, downloadGeneratedPdf } from "@/lib/documentFormatter";
import { toast } from "sonner";
import ToolSidebar from "./ToolSidebar";
import ToolWorkspace from "./ToolWorkspace";
import OutputPanel from "./OutputPanel";
import HistoryPanel from "./HistoryPanel";
import AppNavBar from "../AppNavBar";
import { Loader2 } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import ProjectTimeline from "./ProjectTimeline";
import AssistantChatWorkspace from "./AssistantChatWorkspace";
import {
  buildStudioLinkedContext,
  countFillableFields,
  mergeStudioPrefill,
  type StudioLinkedContext,
} from "@/lib/studioContext";

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

  // Local States
  const [tools, setTools] = useState<ToolFromApi[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [output, setOutput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [linkedContext, setLinkedContext] = useState<StudioLinkedContext | null>(null);

  const tool = tools.find((t) => t.id === activeToolId || t.slug === activeToolId);
  const { t } = useLanguage();

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
        setTools(data);
        // If no tool selected, redirect to the first active tool
        if (!activeToolId && data.length > 0) {
          const firstTool = data.find((t) => t.isActive) || data[0];
          const path = projectIdParam
            ? `/project/${projectIdParam}/studio/${firstTool.id}`
            : `/studio/${firstTool.id}`;
          setLocation(path);
        }
      })
      .catch(() => {})
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
      <div className="min-h-screen bg-frame-black text-frame-white flex flex-col items-center justify-center gap-4">
        <p className="frame-label">{t("app.studio.toolNotFound") as string}</p>
        <button
          type="button"
          onClick={() => setLocation("/tools")}
          className="frame-btn-ghost font-frame-mono text-xs"
        >
          {t("app.studio.backToTools") as string}
        </button>
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
    const values = Object.values(formData).filter(Boolean);
    if (values.length === 0) {
      toast.error(t("app.studio.fillRequiredFields") as string);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setLimitReached(false);

    try {
      const result = await api.ai.generate(tool.id, formData, activeProject?.id);
      setOutput(result.output);
      toast.success(t("app.studio.generationComplete") as string);
      if (activeProject) {
        saveToolStateImmediately(tool.id, formData, result.output);
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
      if (format === "pdf") await downloadGeneratedPdf(output, tool.name);
      else await downloadGeneratedDocx(output, tool.name);
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

  const handleSelectTool = (id: string) => {
    const path = projectIdParam
      ? `/project/${projectIdParam}/studio/${id}`
      : `/studio/${id}`;
    setLocation(path);
  };

  return (
    <div className="studio-app min-h-screen bg-frame-black text-frame-white flex flex-col h-screen overflow-hidden">
      <AppNavBar />
      <ProjectTimeline activeToolId={tool.slug} />

      <div className="studio-workbench flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Tool Sidebar */}
        <ToolSidebar
          tools={tools}
          activeToolId={tool.id}
          onSelectTool={handleSelectTool}
        />

        {/* Studio Shell Body Container */}
        <div className="studio-main flex-1 flex overflow-hidden flex-col md:flex-row relative">
          {tool.slug === "assistente" ? (
            <AssistantChatWorkspace tool={tool} projectId={activeProject?.id} />
          ) : (
            <>
              {/* Main workspace (Inputs & Forms) */}
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
              />

              {/* Output and Refinement Chat Panel */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Limit Reached Warning Alert Banner */}
                {limitReached && (
                  <div className="mx-6 mt-4 px-4 py-3 border border-frame-orange/40 bg-[rgba(255,77,0,0.08)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0 rounded-none">
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
  );
}
