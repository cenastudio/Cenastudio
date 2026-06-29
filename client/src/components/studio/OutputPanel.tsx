import { useState } from "react";
import { type ToolFromApi } from "@/lib/api";
import { cleanGeneratedText } from "@/lib/documentFormatter";
import ActionToolbar from "./ActionToolbar";
import RefineChatPanel from "./RefineChatPanel";
import { useLanguage } from "@/contexts/LanguageContext";

interface OutputPanelProps {
  tool: ToolFromApi;
  output: string;
  onUpdateOutput: (output: string) => void;
  onClearAll: () => void;
  onToggleHistory: () => void;
  onCopy: () => void;
  onDownload: (format: "pdf" | "docx") => void;
}

export default function OutputPanel({
  tool,
  output,
  onUpdateOutput,
  onClearAll,
  onToggleHistory,
  onCopy,
  onDownload,
}: OutputPanelProps) {
  const { t } = useLanguage();
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
              <pre className="whitespace-pre-wrap break-words font-frame-body text-[0.88rem] leading-[1.8] text-frame-cream selection:bg-frame-orange selection:text-frame-black">
                {displayOutput}
              </pre>
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
