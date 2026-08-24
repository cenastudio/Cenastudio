import { type ToolFromApi } from "@/lib/api";
import FormDispatcher from "./forms/FormDispatcher";
import { ClipboardList, FileText, Link2, Loader2, Layers, Sparkles } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import StudioTextLocalizer from "./StudioTextLocalizer";
import { PROJECT_TEMPLATES, applyTemplateToSlug } from "@/lib/studioContext";
import { useState } from "react";
import { visibleFormValues } from "@/lib/workflow";

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
  onApplyTemplate?: (fields: Record<string, string>) => void;
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
  onApplyTemplate,
}: ToolWorkspaceProps) {
  const { autosaveStatus, activeProject } = useProject();
  const { t } = useLanguage();
  const [showTemplates, setShowTemplates] = useState(false);

  // Filter templates that have fields for this tool
  const relevantTemplates = PROJECT_TEMPLATES.filter(tmpl => Object.keys(tmpl.prefill[tool.slug] || {}).length > 0);
  const filledFieldsCount = visibleFormValues(formData).length;
  const fieldStatusLabel = filledFieldsCount > 0
    ? `${filledFieldsCount} ${filledFieldsCount === 1 ? "campo preenchido" : "campos preenchidos"}`
    : "Sem entrada ainda";

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
    <div className="studio-input-panel w-full shrink-0 border-b border-[var(--ds-border)] bg-frame-black/45 p-4 select-none md:p-5 lg:h-full lg:w-[430px] lg:overflow-y-auto lg:border-b-0 lg:border-r xl:w-[460px]">
      <div className="space-y-4">
        <div className="studio-panel-header rounded-xl border border-frame-orange/20 bg-[linear-gradient(145deg,rgba(var(--ds-orange-rgb),0.1),rgba(8,8,8,0.72))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="font-frame-mono text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-frame-orange">
                Entrada guiada
              </span>
              <h2 className="mt-2 text-base font-semibold leading-tight text-frame-white">
                Transforme briefing em saída pronta.
              </h2>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--ds-text-muted)]">
                Preencha só o essencial, aplique contexto quando houver e gere uma versão para revisão.
              </p>
            </div>
            <div className="shrink-0 text-right">
              {renderAutosaveStatus()}
              <p className="mt-2 font-frame-mono text-[0.56rem] uppercase tracking-[0.12em] text-frame-gray-light">
                {fieldStatusLabel}
              </p>
            </div>
          </div>

          <ol className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Entrada", icon: ClipboardList, active: true },
              { label: "Gerar", icon: Sparkles, active: isProcessing },
              { label: "Revisar", icon: FileText, active: Boolean(filledFieldsCount) },
            ].map(({ label, icon: Icon, active }, index) => (
              <li
                key={label}
                className={`min-w-0 rounded-lg border px-2 py-2 ${
                  active ? "border-frame-orange bg-frame-orange/[0.08]" : "border-frame-gray-3/60 bg-frame-black/25"
                }`}
              >
                <span className="block font-frame-mono text-[0.5rem] uppercase tracking-[0.12em] text-frame-orange">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="mt-1 flex min-w-0 items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-frame-orange" aria-hidden="true" />
                  <span className="truncate text-xs font-semibold text-frame-white">{label}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* Template selector — só mostra se tem templates para esta ferramenta */}
        {relevantTemplates.length > 0 && (
          <div className="rounded-xl border border-frame-gray-3/60 bg-frame-black/25 p-3">
            <button
              type="button"
              onClick={() => setShowTemplates(v => !v)}
              className="mb-2 flex min-h-10 w-full items-center justify-between gap-2 rounded-lg px-1 font-frame-mono text-[0.58rem] uppercase tracking-[0.14em] text-frame-gray-light transition-[color,border-color,background-color] hover:text-frame-orange"
              aria-expanded={showTemplates}
            >
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" aria-hidden="true" />
                Templates de projeto
              </span>
              <span className="rounded border border-frame-gray-3 px-1.5 py-0.5 text-[0.5rem]">
                {relevantTemplates.length}
              </span>
            </button>
            {showTemplates && (
              <div className="grid grid-cols-2 gap-1.5">
                {relevantTemplates.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      const { merged, applied } = applyTemplateToSlug(tmpl, tool.slug, formData);
                      if (applied === 0) return;
                      for (const [k, v] of Object.entries(merged)) {
                        if (formData[k] !== v) onChangeField(k, v);
                      }
                      setShowTemplates(false);
                    }}
                    className="group min-h-[74px] rounded-lg border border-frame-gray-3/50 p-2 text-left transition-[color,border-color,background-color] hover:border-frame-orange/40 hover:bg-frame-orange/[0.04]"
                  >
                    <span className="block text-base mb-0.5">{tmpl.icon}</span>
                    <span className="block truncate font-frame-mono text-[0.56rem] text-frame-white transition-colors group-hover:text-frame-orange">{tmpl.label}</span>
                    <span className="block text-[0.52rem] text-frame-gray-light">{tmpl.description}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {linkedContext && linkedContext.availableCount > 0 && (
          <div className="rounded-xl border border-frame-orange/30 bg-frame-orange/5 p-3 shadow-[inset_0_0_0_1px_rgba(255,77,0,0.04)]">
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
                className="shrink-0 rounded-lg border border-frame-orange/45 px-2.5 py-2 font-frame-mono text-[0.56rem] uppercase tracking-[0.12em] text-frame-orange transition hover:bg-frame-orange hover:text-frame-black disabled:cursor-not-allowed disabled:border-frame-gray-3 disabled:text-frame-gray-light disabled:hover:bg-transparent"
              >
                {t("app.studio.linkedContextFill") as string}
              </button>
            </div>
          </div>
        )}

        {/* Specialized Form Dispatcher */}
        <div className="studio-form-stack space-y-4 rounded-xl border border-frame-gray-3/60 bg-frame-black/25 p-3">
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
          <p className="mt-2 rounded-lg border border-[var(--ds-danger)]/20 bg-[var(--ds-danger)]/5 p-2 font-frame-mono text-[0.65rem] leading-relaxed text-[var(--ds-danger)]">
            {error}
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
