import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Film,
  FileText,
  Video,
  Users,
  ChevronLeft,
} from "lucide-react";

interface ProjectNavProps {
  projectId: number;
}

const TABS = [
  { path: (id: number) => `/project/${id}`, labelKey: "app.common.overview", icon: LayoutDashboard },
  { path: (id: number) => `/project/${id}/studio/01`, labelKey: "app.common.studio", icon: Film },
  { path: (id: number) => `/project/${id}/documents`, labelKey: "app.nav.docs", icon: FileText },
  { path: (id: number) => `/project/${id}/files`, labelKey: "app.common.materials", icon: FileText },
  { path: (id: number) => `/project/${id}/video-reviews`, labelKey: "app.common.approval", icon: Video },
  { path: (id: number) => `/project/${id}/collaborators`, labelKey: "app.common.team", icon: Users },
];

export default function ProjectNav({ projectId }: ProjectNavProps) {
  const { t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [projectName, setProjectName] = useState("");
  const currentSection = location.replace(`/project/${projectId}/`, "").split("/")[0] || "";

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
          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {TABS.map((tab) => {
              const isActive =
                tab.path(projectId) === location ||
                (currentSection && tab.path(projectId).includes(`/project/${projectId}/${currentSection}`));
              return (
                <button
                  key={tab.labelKey}
                  type="button"
                  onClick={() => setLocation(tab.path(projectId))}
                  className={`flex min-h-10 items-center gap-1.5 px-3 py-1.5 text-xs font-frame-mono tracking-wider transition whitespace-nowrap ${
                    isActive
                      ? "text-frame-orange border-b-2 border-frame-orange"
                      : "text-frame-gray-light hover:text-frame-white border-b-2 border-transparent"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {t(tab.labelKey) as string}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
