import { type ToolFromApi } from "@/lib/api";
import FormDispatcher from "./forms/FormDispatcher";
import { Loader2 } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface ToolWorkspaceProps {
  tool: ToolFromApi;
  formData: Record<string, string>;
  onChangeField: (key: string, value: string) => void;
  onExecute: () => void;
  isProcessing: boolean;
  error: string | null;
  onSetOutput?: (output: string) => void;
}

export default function ToolWorkspace({
  tool,
  formData,
  onChangeField,
  onExecute,
  isProcessing,
  error,
  onSetOutput,
}: ToolWorkspaceProps) {
  const { autosaveStatus, activeProject } = useProject();
  const { t } = useLanguage();

  const renderAutosaveStatus = () => {
    if (!activeProject) {
      return (
        <span className="font-frame-mono text-[0.62rem] text-[var(--ds-text-muted)]">
          {t("app.studio.preProduction") as string}
        </span>
      );
    }

    switch (autosaveStatus) {
      case "saving":
        return (
          <span className="flex items-center gap-1.5 font-frame-mono text-[0.62rem] text-[var(--ds-primary)] animate-pulse">
            <span className="w-1 h-1 rounded-full bg-[var(--ds-primary)]" />
            {t("app.studio.saving") as string}
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1.5 font-frame-mono text-[0.62rem] text-[var(--ds-success)] transition-colors duration-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-success)]" />
            {t("app.studio.saved") as string}
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1.5 font-frame-mono text-[0.62rem] text-[var(--ds-danger)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--ds-danger)] animate-ping" />
            {t("app.common.error") as string}
          </span>
        );
      case "idle":
      default:
        return (
          <span className="flex items-center gap-1.5 font-frame-mono text-[0.62rem] text-[var(--ds-text-muted)]">
            <span className="w-1 h-1 rounded-full bg-[var(--ds-text-muted)]" />
            {t("app.studio.ready") as string}
          </span>
        );
    }
  };

  return (
    <div className="studio-input-panel w-full lg:w-[390px] shrink-0 p-4 md:p-5 overflow-y-auto border-b lg:border-b-0 lg:border-r border-[var(--ds-border)] flex flex-col justify-between h-full select-none">
      <div className="space-y-4">
        {/* Workspace Title & Input Marker */}
        <div className="studio-panel-header flex justify-between items-center border-b border-[var(--ds-border)] pb-3 mb-3">
          <div>
            <span className="font-frame-mono text-[0.62rem] tracking-[0.18em] uppercase text-[var(--ds-primary)] font-semibold">
              {t("app.studio.inputParams") as string}
            </span>
            <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--ds-text-muted)]">
              {t("app.studio.inputHint") as string}
            </p>
          </div>
          {renderAutosaveStatus()}
        </div>

        {/* Specialized Form Dispatcher */}
        <div className="studio-form-stack space-y-4">
          <FormDispatcher
            slug={tool.slug}
            data={formData}
            onChange={onChangeField}
            onSetOutput={onSetOutput}
          />
        </div>

        {/* Error Notice */}
        {error && (
          <p className="text-[var(--ds-danger)] font-frame-mono text-[0.65rem] mt-2 border border-[var(--ds-danger)]/20 bg-[var(--ds-danger)]/5 p-2 rounded-[var(--ds-radius-1)] leading-relaxed">
            ⚠ {error}
          </p>
        )}
      </div>

      {/* Execution Button */}
      {tool.slug !== "checklist" && (
        <div className="studio-runbar pt-4 mt-4 border-t border-[var(--ds-border)]">
          <button
            type="button"
            onClick={onExecute}
            disabled={isProcessing}
            className="frame-btn-primary w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("app.studio.processing") as string}
              </>
            ) : (
              <>▶ {t("app.studio.runAI") as string}</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
