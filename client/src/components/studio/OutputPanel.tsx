import { useState } from "react";
import { type ToolFromApi } from "@/lib/api";
import { cleanGeneratedText } from "@/lib/documentFormatter";
import ActionToolbar from "./ActionToolbar";
import RefineChatPanel from "./RefineChatPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { FileText } from "lucide-react";

interface OutputPanelProps {
  tool: ToolFromApi;
  output: string;
  projectId?: number | null;
  onUpdateOutput: (output: string) => void;
  onClearAll: () => void;
  onToggleHistory: () => void;
  onCopy: () => void;
  onDownload: (format: "pdf" | "docx") => void;
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
