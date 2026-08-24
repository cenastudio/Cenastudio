import { useState } from "react";
import { type ToolFromApi } from "@/lib/api";
import { cleanGeneratedText } from "@/lib/documentFormatter";
import ActionToolbar from "./ActionToolbar";
import RefineChatPanel from "./RefineChatPanel";
import BudgetBridgeAction from "./BudgetBridgeAction";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { CheckCircle2, FileText, Send, Archive, ChevronRight, Sparkles, Wand2, ClipboardList } from "lucide-react";
import type { ArtifactStatus } from "@/lib/workflow";
import { getNextToolSuggestions } from "@/lib/workflow";

interface OutputPanelProps {
  tool: ToolFromApi;
  output: string;
  projectId?: number | null;
  onUpdateOutput: (output: string) => void;
  onClearAll: () => void;
  onToggleHistory: () => void;
  onCopy: () => void;
  onDownload: (format: "pdf" | "docx") => void;
  artifactStatus?: ArtifactStatus;
  artifactVersion?: number;
  onArtifactStatusChange?: (status: ArtifactStatus) => void;
}

export default function OutputPanel({
  tool,
  output,
  projectId,
  onUpdateOutput,
  onClearAll,
  onToggleHistory,
  onCopy,
  onDownload,
  artifactStatus = "draft",
  artifactVersion = 1,
  onArtifactStatusChange,
}: OutputPanelProps) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"document" | "refine">("document");
  const displayOutput = cleanGeneratedText(output);
  const nextSuggestions = getNextToolSuggestions(tool.slug);

  // Se o output for limpo, volta para a aba documento
  const handleTabChange = (tab: "document" | "refine") => {
    if (tab === "refine" && !output) return;
    setActiveTab(tab);
  };

  // Se output for apagado estando na tab refine, volta para document
  if (!output && activeTab === "refine") {
    setActiveTab("document");
  }

  return (
    <div className="flex-1 flex flex-col rounded-2xl border border-frame-gray-2 bg-frame-black">
      {/* Top Action Toolbar */}
      <ActionToolbar
        onCopy={onCopy}
        onDownload={onDownload}
        onClear={onClearAll}
        onToggleHistory={onToggleHistory}
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        hasOutput={!!output}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col">
        {activeTab === "refine" ? (
          <RefineChatPanel
            toolId={tool.id}
            currentOutput={output}
            onRefineComplete={onUpdateOutput}
          />
        ) : (
          <div className="flex-1 p-4 md:p-6">
            {output ? (
              <div className="space-y-5">
                {projectId && onArtifactStatusChange && (
                  <div className="rounded-xl border border-frame-gray-3 bg-frame-black/30 p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-frame-mono text-[0.56rem] uppercase tracking-[0.16em] text-frame-orange">Ciclo do artefato · v{artifactVersion}</p>
                        <p className="mt-1 text-[0.72rem] text-frame-gray-light">A versão acompanha o job até revisão, aprovação e arquivo.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1 sm:flex" role="group" aria-label="Status do artefato">
                        {([
                          ["draft", "Rascunho", FileText],
                          ["review", "Em revisão", Send],
                          ["approved", "Aprovado", CheckCircle2],
                          ["archived", "Arquivado", Archive],
                        ] as const).map(([status, label, Icon]) => (
                          <button key={status} type="button" onClick={() => onArtifactStatusChange(status)} className={`flex min-h-9 items-center justify-center gap-1.5 rounded-lg border px-2.5 font-frame-mono text-[0.54rem] uppercase tracking-[0.08em] transition ${artifactStatus === status ? "border-frame-orange bg-frame-orange/10 text-frame-orange" : "border-frame-gray-3 text-frame-gray-light hover:text-frame-white"}`} aria-pressed={artifactStatus === status}>
                            <Icon className="h-3 w-3" /> {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3 rounded-xl border border-frame-gray-3 bg-frame-gray-1/55 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-frame-mono text-[0.58rem] uppercase tracking-[0.16em] text-frame-orange">
                      {t("app.studio.outputNextStep") as string}
                    </p>
                    <p className="mt-1 text-[0.76rem] leading-relaxed text-frame-gray-light">
                      {t("app.studio.outputNextStepDesc") as string}
                    </p>
                  </div>
                  {projectId && (
                    <button
                      type="button"
                      onClick={() => setLocation(`/project/${projectId}/documents`)}
                      className="frame-btn-ghost flex items-center justify-center gap-2 px-3 py-2"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {t("app.studio.openProjectDocs") as string}
                    </button>
                  )}
                </div>

                {/* Ponte Orçamento IA → módulo de Orçamento (ADR-013). Só na
                    ferramenta 04, que é a única que emite o bloco estruturado. */}
                {tool.slug === "orcamento" && (
                  <BudgetBridgeAction output={output} projectId={projectId} />
                )}

                <article className="rounded-2xl border border-frame-gray-3/60 bg-frame-gray-1/40 p-4 md:p-6">
                  <pre className="whitespace-pre-wrap break-words font-frame-body text-[0.92rem] leading-[1.85] text-frame-cream selection:bg-frame-orange selection:text-frame-black">
                    {displayOutput}
                  </pre>
                </article>

                {/* ─── PRÓXIMA FERRAMENTA SUGERIDA ─── */}
                {nextSuggestions.length > 0 && (
                  <div className="mt-2 space-y-3 rounded-xl border border-frame-gray-3/50 bg-frame-gray-2/20 p-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-frame-orange" />
                      <span className="font-frame-mono text-[0.58rem] uppercase tracking-[0.18em] text-frame-orange">
                        Próximo passo sugerido
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {nextSuggestions.map((s) => (
                        <button
                          key={s.slug}
                          type="button"
                          onClick={() => {
                            const path = projectId
                              ? `/project/${projectId}/studio/${s.slug}`
                              : `/studio/${s.slug}`;
                            setLocation(path);
                          }}
                          className="group flex w-full items-center gap-3 rounded-lg border border-frame-gray-3/50 p-3 text-left transition-[background-color,border-color] hover:border-frame-orange/40 hover:bg-frame-orange/[0.04]"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[0.78rem] font-semibold text-frame-white group-hover:text-frame-orange transition-colors">{s.label}</p>
                            <p className="text-[0.62rem] text-frame-gray-light mt-0.5 leading-relaxed">{s.reason}</p>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-frame-gray-light group-hover:text-frame-orange transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[420px] flex-col justify-between gap-6 rounded-2xl border border-frame-orange/20 bg-[radial-gradient(circle_at_20%_0%,rgba(var(--ds-orange-rgb),0.13),transparent_34%),rgba(16,16,16,0.72)] p-5 md:p-7">
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-frame-orange/35 bg-frame-orange/[0.08]">
                    <Wand2 className="h-5 w-5 text-frame-orange" aria-hidden="true" />
                  </div>
                  <p className="mt-5 font-frame-mono text-[0.58rem] uppercase tracking-[0.18em] text-frame-orange">
                    Saída do Studio IA
                  </p>
                  <h2 className="mt-2 max-w-2xl text-2xl font-semibold leading-tight text-frame-white md:text-3xl">
                    O artefato aparece aqui assim que o brief estiver pronto.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-frame-gray-light">
                    Gere uma primeira versão, revise no próprio Studio e então copie, exporte ou avance para a próxima peça da jornada.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { label: "1. Brief", text: "Preencha os campos essenciais.", icon: ClipboardList },
                    { label: "2. Versão", text: "Gere um rascunho editável.", icon: Sparkles },
                    { label: "3. Próximo passo", text: "Exporte ou continue o fluxo.", icon: FileText },
                  ].map(({ label, text, icon: Icon }) => (
                    <div key={label} className="rounded-xl border border-frame-gray-3/60 bg-frame-black/35 p-3">
                      <Icon className="h-4 w-4 text-frame-orange" aria-hidden="true" />
                      <p className="mt-3 font-frame-mono text-[0.58rem] uppercase tracking-[0.12em] text-frame-white">{label}</p>
                      <p className="mt-1 text-[0.7rem] leading-relaxed text-frame-gray-light">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
