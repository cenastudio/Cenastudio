import AppNavBar from "@/components/AppNavBar";
import ProductionNav from "@/components/ProductionNav";
import EmptyState from "@/components/EmptyState";
import ProtectedRoute from "@/components/ProtectedRoute";
import { SkeletonCardGrid } from "@/components/skeletons";
import { ExportButton } from "@/components/ExportButton";
import { useProject } from "@/contexts/ProjectContext";
import { useBehaviorPreferences } from "@/contexts/BehaviorPreferencesContext";
import { Archive, ArrowRight, Grid2X2, List, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { WORKFLOW_STAGES } from "@/lib/workflow";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkActionBar, BULK_ACTIONS } from "@/components/BulkActionBar";
import { usePersistedFilters } from "@/hooks/usePersistedFilters";
import { toast } from "sonner";
import { api } from "@/lib/api";

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
  const { projects, isLoading, loadProjects } = useProject();
  const [, setLocation] = useLocation();
  const { locale, t } = useLanguage();
  const { preferences: behaviorPrefs } = useBehaviorPreferences();
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState(behaviorPrefs.defaultProjectSort);
  const [viewMode, setViewMode] = useState(behaviorPrefs.defaultView);

  useEffect(() => setSortMode(behaviorPrefs.defaultProjectSort), [behaviorPrefs.defaultProjectSort]);
  useEffect(() => setViewMode(behaviorPrefs.defaultView), [behaviorPrefs.defaultView]);

  // Persistent status filter; sort/view follow the user's behavior preferences.
  const { filters, setFilter, resetFilters, isDefault } = usePersistedFilters({
    storageKey: "projects-filters",
    defaultFilters: { status: "active" },
    syncWithUrl: true,
  });

  // Bulk selection
  const bulkSelection = useBulkSelection({
    items: projects,
    getId: (project) => project.id,
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) =>
      (filters.status === "all" || project.status === filters.status) &&
      (!term || project.name.toLowerCase().includes(term) || project.clientName?.toLowerCase().includes(term)),
    );
  }, [projects, search, filters.status]);

  const sortedProjects = useMemo(() => [...filtered].sort((a, b) => {
    if (sortMode === "alphabetical") return a.name.localeCompare(b.name, locale === "en" ? "en" : "pt-BR");
    if (sortMode === "deadline") {
      const aDeadline = getMetadata(a.metadataJson).deadline;
      const bDeadline = getMetadata(b.metadataJson).deadline;
      const aTime = aDeadline ? new Date(`${aDeadline}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
      const bTime = bDeadline ? new Date(`${bDeadline}T00:00:00`).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }), [filtered, locale, sortMode]);

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!window.confirm(t("app.projects.confirmBulkDelete") as string || `Deletar ${bulkSelection.selectedCount} projeto(s)?`)) {
      return;
    }

    try {
      // Delete each selected project
      await Promise.all(
        bulkSelection.selectedItems.map(project =>
          api.projects.delete(project.id)
        )
      );

      toast.success(t("app.projects.bulkDeleteSuccess") as string || `${bulkSelection.selectedCount} projeto(s) deletado(s)`);
      bulkSelection.deselectAll();
      loadProjects();
    } catch (error) {
      toast.error(t("app.errors.generic") as string || "Erro ao deletar projetos");
    }
  };

  const handleBulkArchive = async () => {
    try {
      await Promise.all(
        bulkSelection.selectedItems.map(project =>
          api.projects.update(project.id, { status: "archived" })
        )
      );

      toast.success(t("app.projects.bulkArchiveSuccess") as string || `${bulkSelection.selectedCount} projeto(s) arquivado(s)`);
      bulkSelection.deselectAll();
      loadProjects();
    } catch (error) {
      toast.error(t("app.errors.generic") as string || "Erro ao arquivar projetos");
    }
  };

  const bulkActions = [
    BULK_ACTIONS.ARCHIVE(handleBulkArchive),
    BULK_ACTIONS.DELETE(handleBulkDelete),
  ];

  return (
    <div className={`${embedded ? "" : "min-h-screen"} bg-frame-black text-frame-white`}>
      {!embedded && <AppNavBar />}
      {!embedded && <ProductionNav />}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={bulkSelection.selectedCount}
        onDeselectAll={bulkSelection.deselectAll}
        actions={bulkActions}
        position="top"
      />

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

        {/* Filters and current presentation controls */}
        <section className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_150px_190px_auto_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-frame-gray-light" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="frame-input w-full pl-10" placeholder={t("app.projects.searchPlaceholder")} />
          </label>
          <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="frame-input w-full">
            <option value="active">{t("app.projects.filterActive")}</option>
            <option value="completed">{t("app.projects.filterCompleted")}</option>
            <option value="archived">{t("app.projects.filterArchived")}</option>
            <option value="all">{t("app.projects.filterAll")}</option>
          </select>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)} className="frame-input w-full" aria-label="Ordenar projetos">
            <option value="recent">Mais recentes</option>
            <option value="alphabetical">Ordem alfabética</option>
            <option value="deadline">Deadline</option>
          </select>
          <div className="flex border border-frame-gray-3" aria-label="Visualização dos projetos">
            <button type="button" onClick={() => setViewMode("grid")} aria-label="Grade" className={`px-3 ${viewMode === "grid" ? "bg-frame-orange text-black" : "text-frame-gray-light"}`}><Grid2X2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setViewMode("list")} aria-label="Lista" className={`px-3 ${viewMode === "list" ? "bg-frame-orange text-black" : "text-frame-gray-light"}`}><List className="h-4 w-4" /></button>
          </div>
          {!isDefault && <button onClick={resetFilters} className="frame-btn-ghost text-xs">{t("app.common.clearFilters") || "Limpar filtros"}</button>}
        </section>

        {/* Content */}
        {isLoading ? (
          <SkeletonCardGrid count={6} cols={3} />
        ) : sortedProjects.length === 0 ? (
          <EmptyState
            icon={Archive}
            title={t("app.projects.emptyTitle")}
            description={t("app.projects.emptyDescription")}
            action={{ label: t("app.projects.newJob"), onClick: () => setLocation("/dashboard?newProject=1") }}
          />
        ) : (
          <section className={viewMode === "grid" ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
            {sortedProjects.map((project) => {
              const meta = getMetadata(project.metadataJson);
              const deadline = meta.deadline;
              const stageLabel = getStageLabel(meta, locale);
              const clientName = project.clientName || meta.creativeGoals?.client;

              return (
                <motion.button
                  key={project.id}
                  type="button"
                  onClick={() => setLocation(`/project/${project.id}`)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{
                    scale: 1.005,
                    y: -2,
                    boxShadow: "0 4px 20px rgba(255, 107, 0, 0.12)"
                  }}
                  transition={{ duration: 0.2 }}
                  className={`w-full group border border-frame-gray-3 bg-frame-gray-1/10 p-5 text-left hover:border-frame-orange/50 hover:bg-frame-orange/[0.02] ${viewMode === "grid" ? "min-h-[220px]" : ""}`}
                >
                  <div className={viewMode === "grid" ? "flex h-full flex-col justify-between gap-6" : "flex flex-col sm:flex-row sm:items-center justify-between gap-4"}>
                    {/* Left: info */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-3">
                        <motion.h2
                          className="text-lg font-semibold text-frame-white group-hover:text-frame-orange transition truncate"
                          whileHover={{ x: 2 }}
                          transition={{ duration: 0.15 }}
                        >
                          {project.name}
                        </motion.h2>
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
                      <motion.span
                        className="flex items-center gap-1 font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-orange group-hover:text-frame-white transition"
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.15 }}
                      >
                        {t("app.projects.open")} <ArrowRight className="h-3 w-3" />
                      </motion.span>
                    </div>
                  </div>
                </motion.button>
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
