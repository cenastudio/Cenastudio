import { type ToolFromApi } from "@/lib/api";
import FormDispatcher from "./forms/FormDispatcher";
import { Link2, Loader2 } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import StudioTextLocalizer from "./StudioTextLocalizer";

interface LinkedContextSummary {
  projectName?: string;
  clientName?: string;
  sourceLabel: string;
  availableCount: number;
  fillableCount: number;
}

interface ToolWorkspaceProps {
  tool: ToolFromApi;
  formData: Record<string, string>;
  onChangeField: (key: string, value: string) => void;
  onExecute: () => void;
  isProcessing: boolean;
  error: string | null;
  linkedContext?: LinkedContextSummary | null;
  onApplyLinkedContext?: () => void;
  onSetOutput?: (output: string) => void;
}

export default function ToolWorkspace({
  tool,
  formData,
  onChangeField,
  onExecute,
  isProcessing,
  error,
  linkedContext,
  onApplyLinkedContext,
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

        {linkedContext && linkedContext.availableCount > 0 && (
          <div className="border border-frame-orange/30 bg-frame-orange/5 p-3 shadow-[inset_0_0_0_1px_rgba(255,77,0,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-frame-orange" />
                  <span className="font-frame-mono text-[0.6rem] uppercase tracking-[0.16em] text-frame-orange">
                    {t("app.studio.linkedContextTitle") as string}
                  </span>
                </div>
                <p className="mt-2 truncate text-[0.72rem] text-frame-white">
                  {linkedContext.sourceLabel}
                </p>
                <p className="mt-1 text-[0.64rem] leading-relaxed text-frame-gray-light">
                  {linkedContext.fillableCount > 0
                    ? `${linkedContext.fillableCount} ${t("app.studio.linkedContextFieldsReady") as string}`
                    : t("app.studio.linkedContextSynced") as string}
                </p>
              </div>
              <button
                type="button"
                onClick={onApplyLinkedContext}
                disabled={!linkedContext.fillableCount}
                className="shrink-0 border border-frame-orange/45 px-2.5 py-2 font-frame-mono text-[0.56rem] uppercase tracking-[0.12em] text-frame-orange transition hover:bg-frame-orange hover:text-frame-black disabled:cursor-not-allowed disabled:border-frame-gray-3 disabled:text-frame-gray-light disabled:hover:bg-transparent"
              >
                {t("app.studio.linkedContextFill") as string}
              </button>
            </div>
          </div>
        )}

        {/* Specialized Form Dispatcher */}
        <div className="studio-form-stack space-y-4">
          <StudioTextLocalizer>
            <FormDispatcher
              slug={tool.slug}
              data={formData}
              onChange={onChangeField}
              onSetOutput={onSetOutput}
            />
          </StudioTextLocalizer>
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
