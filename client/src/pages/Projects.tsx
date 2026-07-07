import AppNavBar from "@/components/AppNavBar";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SkeletonCardGrid } from "@/components/skeletons";
import { ExportButton } from "@/components/ExportButton";
import { useProject } from "@/contexts/ProjectContext";
import { Archive, ArrowRight, Calendar, Plus, Search, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { WORKFLOW_STAGES } from "@/lib/workflow";
import { useLanguage } from "@/contexts/LanguageContext";

function getMetadata(metadataJson: string) {
  try {
    return JSON.parse(metadataJson || "{}") as {
      deadline?: string;
      workflowStage?: string;
      workflowFocus?: string;
      projectType?: string;
      creativeGoals?: { client?: string; format?: string };
    };
  } catch {
    return {};
  }
}

function getStageLabel(meta: ReturnType<typeof getMetadata>, locale = "pt"): string {
  const stageId = meta.workflowStage || meta.workflowFocus;
  if (!stageId) return locale === "en" ? "Intake" : "Entrada";
  const stage = WORKFLOW_STAGES.find((s) => s.id === stageId);
  return (locale === "en" ? stage?.labelEn : stage?.label) || (locale === "en" ? "Intake" : "Entrada");
}

function ProjectsContent({ embedded }: { embedded?: boolean }) {
  const { projects, isLoading } = useProject();
  const [, setLocation] = useLocation();
  const { locale, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) =>
      (status === "all" || project.status === status) &&
      (!term || project.name.toLowerCase().includes(term) || project.clientName?.toLowerCase().includes(term)),
    );
  }, [projects, search, status]);

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-frame-black text-frame-white`}>
      {!embedded && <AppNavBar />}
      <main id="main-content" className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6">

        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-frame-gray-3 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="frame-label mb-2">{t("app.projects.productionArea")}</p>
            <h1 className="frame-title text-[clamp(1.8rem,3.5vw,2.8rem)]">Jobs</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-frame-gray-light">
              {t("app.projects.description")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <ExportButton entityType="projects" variant="outline" size="default" />
            <button type="button" onClick={() => setLocation("/dashboard?newProject=1")} className="frame-btn-primary flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> {t("app.projects.newJob")}
            </button>
          </div>
        </header>

        {/* Filters */}
        <section className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-frame-gray-light" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="frame-input w-full pl-10" placeholder={t("app.projects.searchPlaceholder")} />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="frame-input w-full">
            <option value="active">{t("app.projects.filterActive")}</option>
            <option value="completed">{t("app.projects.filterCompleted")}</option>
            <option value="archived">{t("app.projects.filterArchived")}</option>
            <option value="all">{t("app.projects.filterAll")}</option>
          </select>
        </section>

        {/* Content */}
        {isLoading ? (
          <SkeletonCardGrid count={6} cols={3} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Archive}
            title={t("app.projects.emptyTitle")}
            description={t("app.projects.emptyDescription")}
            action={{ label: t("app.projects.newJob"), onClick: () => setLocation("/dashboard?newProject=1") }}
          />
        ) : (
          <section className="space-y-3">
            {filtered.map((project) => {
              const meta = getMetadata(project.metadataJson);
              const deadline = meta.deadline;
              const stageLabel = getStageLabel(meta, locale);
              const clientName = project.clientName || meta.creativeGoals?.client;

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setLocation(`/project/${project.id}`)}
                  className="w-full group border border-frame-gray-3 bg-frame-gray-1/10 p-5 text-left transition hover:border-frame-orange/50 hover:bg-frame-orange/[0.02]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Left: info */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-frame-white group-hover:text-frame-orange transition truncate">
                          {project.name}
                        </h2>
                        {meta.projectType && (
                          <span className="font-frame-mono text-[0.52rem] tracking-wider uppercase text-frame-orange border border-frame-orange/25 bg-frame-orange/[0.06] px-1.5 py-0.5 shrink-0">
                            {meta.projectType}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-frame-gray-light truncate">
                        {clientName && <span className="text-frame-orange">{clientName}</span>}
                        {clientName && project.description && <span className="mx-2 text-frame-gray-light/40">·</span>}
                        {project.description || (!clientName && t("app.projects.noContext"))}
                      </p>
                    </div>

                    {/* Right: meta */}
                    <div className="flex items-center gap-5 shrink-0">
                      {/* Stage */}
                      <div className="text-center hidden sm:block">
                        <span className="font-frame-mono text-[0.52rem] uppercase tracking-wider text-frame-gray-light block">{t("app.projects.stage")}</span>
                        <span className="text-xs font-medium text-frame-white">{stageLabel}</span>
                      </div>
                      {/* Deadline */}
                      <div className="text-center hidden sm:block">
                        <span className="font-frame-mono text-[0.52rem] uppercase tracking-wider text-frame-gray-light block">{t("app.projects.deadline")}</span>
                        <span className={`text-xs font-medium ${deadline ? "text-frame-orange" : "text-frame-gray-light"}`}>
                          {deadline ? new Date(`${deadline}T00:00:00`).toLocaleDateString(locale === "en" ? "en-US" : "pt-BR") : "—"}
                        </span>
                      </div>
                      {/* CTA */}
                      <span className="flex items-center gap-1 font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-orange group-hover:text-frame-white transition">
                        {t("app.projects.open")} <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
}

export default function Projects({ embedded }: { embedded?: boolean }) {
  if (embedded) return <ProjectsContent embedded />;
  return <ProtectedRoute><ProjectsContent /></ProtectedRoute>;
}
