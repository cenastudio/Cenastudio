import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useProject } from "@/contexts/ProjectContext";
import { api } from "@/lib/api";
import { Check, Flame } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface TimelineStep {
  id: string;
  name: string;
  categoryKey: string;
}

const TIMELINE_STEPS: TimelineStep[] = [
  { id: "briefing", name: "Briefing", categoryKey: "commercial" },
  { id: "roteiro", name: "Roteiro", categoryKey: "preProd" },
  { id: "decupagem", name: "Decupagem", categoryKey: "preProd" },
  { id: "callsheet", name: "Callsheet", categoryKey: "preProd" },
  { id: "cronograma", name: "Cronograma", categoryKey: "preProd" },
  { id: "checklist", name: "Checklist", categoryKey: "preProd" },
  { id: "entrega", name: "Entrega", categoryKey: "posProd" },
];

interface ProjectTimelineProps {
  activeToolId: string;
}

export default function ProjectTimeline({ activeToolId }: ProjectTimelineProps) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { activeProject, toolStates } = useProject();
  const timelineCategories: Record<string, string> = {
    commercial: t("app.studio.timeline.commercial") as string,
    preProd: t("app.studio.timeline.preProd") as string,
    posProd: t("app.studio.timeline.posProd") as string,
  };
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
      setLocation(`/project/${activeProject.id}/studio/${stepId}`);
    } else {
      setLocation(`/studio/${stepId}`);
    }
  };

  // Helper to determine if step has any content (either fetched from DB or in memory cache)
  const isStepPopulated = (stepId: string) => {
    // Check in-memory active cache
    const cache = toolStates[stepId];
    if (cache) {
      const hasForm = Object.values(cache.formData || {}).some(Boolean);
      const hasOutput = !!cache.outputData && cache.outputData.trim().length > 0;
      if (hasForm || hasOutput) return true;
    }
    // Check SQLite fetched steps list
    return populatedSteps.includes(stepId);
  };

  return (
    <div className="w-full bg-frame-gray-1 border-b border-frame-gray-2 px-6 py-3 select-none flex items-center justify-between overflow-x-auto scrollbar-thin">
      <div className="flex items-center gap-6 min-w-max w-full">
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

          {TIMELINE_STEPS.map((step, idx) => {
            const isActive = step.id === activeToolId;
            const isFilled = isStepPopulated(step.id);
            
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleNavigateStep(step.id)}
                className="flex items-center gap-1.5 md:gap-2.5 z-10 bg-frame-gray-1 px-2 py-1 border border-transparent hover:border-frame-gray-3 transition-[background-color,border-color,color,transform] duration-200 group rounded-none outline-none shrink-0"
              >
                {/* Node circle state */}
                <div
                  className={`w-[18px] h-[18px] md:w-5 md:h-5 rounded-full flex items-center justify-center border font-frame-mono text-[0.64rem] font-bold transition duration-300 ${
                    isActive
                      ? "border-frame-orange bg-frame-orange text-frame-black shadow-[0_0_12px_rgba(255,77,0,0.3)]"
                      : isFilled
                        ? "border-[#00c864] bg-[#00c864]/10 text-[#00c864]"
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
                    {step.name}
                  </span>
                  <span className="hidden sm:inline font-frame-mono text-[0.6rem] tracking-wider text-frame-gray-muted -mt-0.5">
                    {timelineCategories[step.categoryKey]}
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
