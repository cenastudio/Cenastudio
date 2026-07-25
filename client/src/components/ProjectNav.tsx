import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { BookOpen, ChevronLeft, Wallet, Clapperboard, FileBarChart } from "lucide-react";
import { getStageForLocation, WORKFLOW_STAGES } from "@/lib/workflow";
import { usePlanContext } from "@/contexts/PlanContext";
import { canAccessFeature } from "@/lib/feature-gating";

interface ProjectNavProps {
  projectId: number;
}

export default function ProjectNav({ projectId }: ProjectNavProps) {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [projectName, setProjectName] = useState("");
  const { planMode } = usePlanContext();
  const activeStage = getStageForLocation(location);
  const canAccessBudget = canAccessFeature("budget-tracking", planMode).hasAccess;
  const isBudgetActive = location === `/project/${projectId}/budget`;
  const canAccessDre = canAccessFeature("project-dre", planMode).hasAccess;
  const isDreActive = location === `/project/${projectId}/dre`;
  const canAccessShotList = canAccessFeature("shot-list", planMode).hasAccess;
  const isShotListActive = location === `/project/${projectId}/shotlist`;

  useEffect(() => {
    fetch(`/api/projects/${projectId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setProjectName(data.data.name);
      })
      .catch(() => {});
  }, [projectId]);

  return (
    <div className="border-b border-frame-gray-3 bg-frame-black/95 dark:bg-frame-black/95 backdrop-blur-sm sticky top-16 z-40 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Row 1: utility nav — back, project identity, section tabs (Overview/Budget/Shot List).
            Scrolls horizontally on narrow screens with the same fade-out edge
            used in Row 2 below, instead of silently compressing/cutting off
            the conditional Budget/Shot List tabs. */}
        <div className="relative -mx-4 md:mx-0">
        <div className="flex items-center gap-3 py-2 overflow-x-auto scrollbar-none px-4 md:px-0">
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-frame-gray-light hover:text-frame-orange transition"
            title={t("app.common.backToDashboard") as string}
            aria-label={t("app.common.backToDashboard") as string}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-frame-gray-3" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-frame-mono text-[0.64rem] text-frame-gray-light tracking-widest uppercase shrink-0">
              {t("app.common.project") as string}
            </span>
            <span className="text-sm font-semibold text-frame-white truncate max-w-[200px]">
              {projectName || `#${projectId}`}
            </span>
          </div>
          <div className="h-4 w-px bg-frame-gray-3" />
          <button
            type="button"
            onClick={() => setLocation(`/project/${projectId}`)}
            className={`flex min-h-11 shrink-0 items-center gap-1.5 px-3 py-1.5 font-frame-mono text-xs tracking-wider transition-all duration-200
              relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all
              ${location === `/project/${projectId}`
                ? "text-frame-orange after:bg-frame-orange"
                : "text-frame-gray-light hover:text-frame-white after:bg-transparent"
              }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {t("app.common.overview") as string}
          </button>
          {canAccessBudget && (
            <button
              type="button"
              onClick={() => setLocation(`/project/${projectId}/budget`)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 px-3 py-1.5 font-frame-mono text-xs tracking-wider transition-all duration-200
                relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all
                ${isBudgetActive
                  ? "text-frame-orange after:bg-frame-orange"
                  : "text-frame-gray-light hover:text-frame-white after:bg-transparent"
                }`}
              aria-current={isBudgetActive ? "page" : undefined}
            >
              <Wallet className="h-3.5 w-3.5" />
              Orçamento
            </button>
          )}
          {canAccessDre && (
            <button
              type="button"
              onClick={() => setLocation(`/project/${projectId}/dre`)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 px-3 py-1.5 font-frame-mono text-xs tracking-wider transition-all duration-200
                relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all
                ${isDreActive
                  ? "text-frame-orange after:bg-frame-orange"
                  : "text-frame-gray-light hover:text-frame-white after:bg-transparent"
                }`}
              aria-current={isDreActive ? "page" : undefined}
            >
              <FileBarChart className="h-3.5 w-3.5" />
              DRE
            </button>
          )}
          {canAccessShotList && (
            <button
              type="button"
              onClick={() => setLocation(`/project/${projectId}/shotlist`)}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 px-3 py-1.5 font-frame-mono text-xs tracking-wider transition-all duration-200
                relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:transition-all
                ${isShotListActive
                  ? "text-frame-orange after:bg-frame-orange"
                  : "text-frame-gray-light hover:text-frame-white after:bg-transparent"
                }`}
              aria-current={isShotListActive ? "page" : undefined}
            >
              <Clapperboard className="h-3.5 w-3.5" />
              Shot List
            </button>
          )}
        </div>
        {/* Fade-out edge signals there's more to scroll on narrow viewports */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-frame-black/95 to-transparent md:hidden" aria-hidden="true" />
        </div>

        {/* Row 2: dedicated journey stepper — own row so it isn't squeezed by
            the utility tabs above. Numbered steps get a connecting line and
            more breathing room; horizontal scroll on narrow screens has a
            fade-out edge instead of an abrupt, unindicated cut-off. */}
        <div className="relative -mx-4 md:-mx-6">
          <nav
            className="flex items-center gap-1 overflow-x-auto scrollbar-none px-4 md:px-6 pb-2"
            aria-label={t("app.nav.projectJourney") as string}
          >
            {WORKFLOW_STAGES.map((stage, index) => {
              const isActive = activeStage === stage.id && location !== `/project/${projectId}`;
              const isLast = index === WORKFLOW_STAGES.length - 1;
              return (
                <div key={stage.id} className="flex items-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setLocation(`/project/${projectId}/journey/${stage.id}`)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-2 px-3 py-1.5 whitespace-nowrap rounded-full transition-all duration-200 border
                      ${isActive
                        ? "text-frame-orange border-frame-orange/50 bg-frame-orange/10"
                        : "text-frame-gray-light border-transparent hover:text-frame-white hover:border-frame-gray-3"
                      }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-frame-mono text-[0.55rem] transition-colors
                        ${isActive ? "bg-frame-orange text-frame-black" : "bg-frame-gray-2 text-frame-gray-light"}`}
                    >
                      {stage.number}
                    </span>
                    <span className="text-xs font-frame-mono tracking-wider">{stage.label}</span>
                  </button>
                  {!isLast && <div className="h-px w-4 shrink-0 bg-frame-gray-3/60" aria-hidden="true" />}
                </div>
              );
            })}
          </nav>
          {/* Fade-out edge signals there's more to scroll on narrow viewports */}
          <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-frame-black/95 to-transparent md:hidden" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
