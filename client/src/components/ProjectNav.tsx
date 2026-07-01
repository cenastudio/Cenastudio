import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { BookOpen, ChevronLeft } from "lucide-react";
import { getStageForLocation, WORKFLOW_STAGES } from "@/lib/workflow";

interface ProjectNavProps {
  projectId: number;
}

export default function ProjectNav({ projectId }: ProjectNavProps) {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [projectName, setProjectName] = useState("");
  const activeStage = getStageForLocation(location);

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
        <div className="flex items-center gap-3 py-2">
          <button
            type="button"
            onClick={() => setLocation("/dashboard")}
            className="flex h-9 w-9 shrink-0 items-center justify-center text-frame-gray-light hover:text-frame-orange transition"
            title={t("app.common.backToDashboard") as string}
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
            className={`flex min-h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 py-1.5 font-frame-mono text-xs tracking-wider transition ${location === `/project/${projectId}` ? "border-frame-orange text-frame-orange" : "border-transparent text-frame-gray-light hover:text-frame-white"}`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {t("app.common.overview") as string}
          </button>
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none" aria-label={t("app.nav.projectJourney") as string}>
            {WORKFLOW_STAGES.map((stage) => {
              const isActive = activeStage === stage.id && location !== `/project/${projectId}`;
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setLocation(`/project/${projectId}/journey/${stage.id}`)}
                  className={`flex min-h-10 items-center gap-1.5 px-3 py-1.5 text-xs font-frame-mono tracking-wider transition whitespace-nowrap ${
                    isActive
                      ? "text-frame-orange border-b-2 border-frame-orange"
                      : "text-frame-gray-light hover:text-frame-white border-b-2 border-transparent"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="text-[0.52rem] text-frame-orange">{stage.number}</span>
                  {stage.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
