import { useState } from "react";
import { type ToolFromApi } from "@/lib/api";
import { cleanGeneratedText } from "@/lib/documentFormatter";
import ActionToolbar from "./ActionToolbar";
import RefineChatPanel from "./RefineChatPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { CheckCircle2, FileText, Send, Archive } from "lucide-react";
import type { ArtifactStatus } from "@/lib/workflow";

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-frame-black border-t lg:border-t-0 border-frame-gray-2">
      {/* Top Action Toolbar */}
      <ActionToolbar
        onCopy={onCopy}
        onDownload={onDownload}
        onClear={onClearAll}
        onToggleHistory={onToggleHistory}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        hasOutput={!!output}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "refine" ? (
          <RefineChatPanel
            toolId={tool.id}
            currentOutput={output}
            onRefineComplete={onUpdateOutput}
          />
        ) : (
          <div className="flex-1 p-6 md:p-8 overflow-y-auto">
            {output ? (
              <div className="space-y-5">
                {projectId && onArtifactStatusChange && (
                  <div className="border border-frame-gray-3 bg-frame-black/30 p-3">
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
                          <button key={status} type="button" onClick={() => onArtifactStatusChange(status)} className={`flex min-h-9 items-center justify-center gap-1.5 border px-2.5 font-frame-mono text-[0.54rem] uppercase tracking-[0.08em] transition ${artifactStatus === status ? "border-frame-orange bg-frame-orange/10 text-frame-orange" : "border-frame-gray-3 text-frame-gray-light hover:text-frame-white"}`} aria-pressed={artifactStatus === status}>
                            <Icon className="h-3 w-3" /> {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3 border border-frame-gray-3 bg-frame-gray-1/55 p-3 sm:flex-row sm:items-center sm:justify-between">
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
                <pre className="whitespace-pre-wrap break-words font-frame-body text-[0.88rem] leading-[1.8] text-frame-cream selection:bg-frame-orange selection:text-frame-black">
                  {displayOutput}
                </pre>
              </div>
            ) : (
              <div className="h-full min-h-[250px] flex flex-col items-center justify-center gap-4 opacity-25 select-none">
                <span className="text-[3.2rem] grayscale">{tool.icon}</span>
                <p className="font-frame-mono text-[0.63rem] tracking-[0.18em] uppercase text-frame-gray-light text-center leading-relaxed">
                  {t("app.studio.emptyOutput") as string}
                  <br />
                  {t("app.studio.emptyOutput2") as string}
                  <br />
                  {t("app.studio.emptyOutput3") as string}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
