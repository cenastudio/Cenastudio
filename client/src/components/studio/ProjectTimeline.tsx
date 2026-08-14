import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";
import { Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getStageForTool, isActionComplete, WORKFLOW_STAGES } from "@/lib/workflow";

interface ProjectTimelineProps {
  activeToolId: string;
}

export default function ProjectTimeline({ activeToolId }: ProjectTimelineProps) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { activeProject, toolStates } = useProject();
  const [populatedSteps, setPopulatedSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch which steps are populated in SQLite database
  useEffect(() => {
    if (!activeProject) {
      setPopulatedSteps([]);
      return;
    }

    setLoading(true);
    api.projects
      .populatedStates(activeProject.id)
      .then((data) => {
        setPopulatedSteps(data.map((d) => d.toolId));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeProject]);

  const handleNavigateStep = (stepId: string) => {
    if (activeProject) {
      setLocation(`/project/${activeProject.id}/journey/${stepId}`);
    } else {
      const stage = WORKFLOW_STAGES.find((item) => item.id === stepId);
      const action = stage?.actions.find((item) => item.toolSlug);
      setLocation(action?.toolSlug ? `/studio/${action.toolSlug}` : "/tools");
    }
  };

  const isStagePopulated = (stageId: string) => {
    const stage = WORKFLOW_STAGES.find((item) => item.id === stageId);
    if (!stage) return false;
    return stage.actions.some((action) => {
      const cache = (action.toolId && toolStates[action.toolId]) || (action.toolSlug && toolStates[action.toolSlug]);
      if (cache) {
        const hasForm = Object.entries(cache.formData || {}).some(([key, value]) => !key.startsWith("__") && Boolean(value));
        if (hasForm || cache.outputData?.trim()) return true;
      }
      return isActionComplete(action, populatedSteps);
    });
  };
  const activeStage = getStageForTool(activeToolId);
  const mobileStageValue = activeStage || WORKFLOW_STAGES[0]?.id || "";

  return (
    <div className="w-full bg-frame-gray-1 border-b border-frame-gray-2 px-4 sm:px-6 py-3 select-none">
      <label className="sr-only" htmlFor="studio-mobile-stage">
        {t("app.studio.timeline.pipeline") as string}
      </label>
      <select
        id="studio-mobile-stage"
        value={mobileStageValue}
        onChange={(event) => handleNavigateStep(event.target.value)}
        className="md:hidden w-full min-h-11 bg-frame-black border border-frame-gray-3 px-3 text-sm text-frame-white outline-none focus:border-frame-orange"
      >
        {WORKFLOW_STAGES.map((step, idx) => (
          <option key={step.id} value={step.id}>
            {idx + 1} · {step.label}
          </option>
        ))}
      </select>

      <div className="hidden md:flex items-center gap-6 w-full">
        {/* Cinematic Pipeline Header Label (Hidden on small mobile) */}
        <div className="hidden xl:flex flex-col pr-5 border-r border-frame-gray-2 shrink-0 font-frame-mono select-none">
          <span className="text-[0.62rem] tracking-[0.25em] text-frame-orange font-semibold uppercase">
            {t("app.studio.timeline.flowDirection") as string}
          </span>
          <span className="text-[0.62rem] text-frame-white font-bold tracking-widest uppercase mt-0.5">
            {t("app.studio.timeline.pipeline") as string}
          </span>
        </div>

        {/* Steps Nodes Flex container */}
        <div className="flex items-center flex-1 justify-between gap-1 sm:gap-2 relative">
          {/* Subtle connector timeline line background */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-frame-gray-3/40 z-0 pointer-events-none" />

          {WORKFLOW_STAGES.map((step, idx) => {
            const isActive = step.id === activeStage;
            const isFilled = isStagePopulated(step.id);
            
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleNavigateStep(step.id)}
                className="min-h-11 flex items-center gap-1.5 md:gap-2.5 z-10 bg-frame-gray-1 px-2 py-1 border border-transparent hover:border-frame-gray-3 transition-[background-color,border-color,color,transform] duration-200 group rounded-none outline-none shrink-0"
              >
                {/* Node circle state */}
                <div
                  className={`w-[18px] h-[18px] md:w-5 md:h-5 rounded-full flex items-center justify-center border font-frame-mono text-[0.64rem] font-bold transition duration-300 ${
                    isActive
                      ? "border-frame-orange bg-frame-orange text-frame-black shadow-[0_0_12px_rgba(255,77,0,0.3)]"
                      : isFilled
                        ? "border-frame-green bg-frame-green/10 text-frame-green"
                        : "border-frame-gray-3 bg-frame-black text-frame-gray-light group-hover:border-frame-white group-hover:text-frame-white"
                  }`}
                >
                  {isFilled && !isActive ? (
                    <Check className="w-2.5 h-2.5 stroke-[3px]" />
                  ) : (
                    idx + 1
                  )}
                </div>

                {/* Step Metadata details */}
                <div className="flex flex-col text-left">
                  <span
                    className={`font-frame-display text-[0.72rem] md:text-[0.78rem] tracking-[0.08em] uppercase transition duration-300 ${
                      isActive
                        ? "text-frame-orange font-semibold"
                        : "text-frame-gray-light group-hover:text-frame-white"
                    }`}
                  >
                    {step.label}
                  </span>
                  <span className="hidden sm:inline font-frame-mono text-[0.6rem] tracking-wider text-frame-gray-muted -mt-0.5">
                    {step.eyebrow}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
