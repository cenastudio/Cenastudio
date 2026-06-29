import React, { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown, Folder, Plus, Trash2, Edit3, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ProjectSelector() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/studio/:id");
  const [, projectParams] = useRoute("/project/:projectId/studio/:id");

  const activeToolId = params?.id || projectParams?.id || "";

  const {
    projects,
    activeProject,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
  } = useProject();

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to trigger select project by ID (updating route)
  const handleSelectProject = (projectId: number | null) => {
    if (projectId) {
      setLocation(`/project/${projectId}/studio/${activeToolId}`);
    } else {
      setLocation(`/studio/${activeToolId}`);
    }
  };

  // Handle Create Project
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const newProj = await createProject(name.trim(), description.trim() || undefined);
      setIsCreateOpen(false);
      setName("");
      setDescription("");
      toast.success(t("app.studio.projectSelector.created") as string);
      // Automatically select the new project and redirect
      handleSelectProject(newProj.id);
    } catch {
      // Toast error handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Dialog prefilled
  const openEditDialog = () => {
    if (!activeProject) return;
    setName(activeProject.name);
    setDescription(activeProject.description || "");
    setIsEditOpen(true);
  };

  // Handle Edit Project
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !name.trim()) return;

    setIsSubmitting(true);
    try {
      await updateProject(activeProject.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setIsEditOpen(false);
      setName("");
      setDescription("");
      toast.success(t("app.studio.projectSelector.updated") as string);
    } catch {
      // Handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Project
  const handleDeleteConfirm = async () => {
    if (!activeProject) return;

    setIsSubmitting(true);
    try {
      const id = activeProject.id;
      // Navigate away from this project to generic studio before deleting
      setLocation(`/studio/${activeToolId}`);
      await deleteProject(id);
      setIsDeleteOpen(false);
      toast.success(t("app.studio.projectSelector.deleted") as string);
    } catch {
      // Handled in context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-[18px] py-4 border-b border-frame-gray-2 bg-frame-black/30 select-none">
      <span className="block font-frame-mono text-[0.62rem] tracking-[0.2em] uppercase text-frame-gray-light mb-1.5">
        {t("app.studio.projectSelector.workContext") as string}
      </span>

      <div className="flex gap-1.5 items-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex-1 flex items-center justify-between gap-2.5 px-3 py-2 text-left border border-frame-gray-3 bg-frame-gray-1/80 text-frame-white hover:bg-frame-gray-2 transition group rounded-none outline-none cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Folder
                  className={`w-3.5 h-3.5 shrink-0 ${
                    activeProject ? "text-frame-orange animate-pulse" : "text-frame-gray-light"
                  }`}
                />
                <span className="text-[0.76rem] font-medium tracking-wide font-frame-body truncate">
                  {activeProject ? activeProject.name : t("app.studio.projectSelector.noProject") as string}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 text-frame-gray-light group-hover:text-frame-white transition-colors" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-[220px] bg-frame-gray-1 border-frame-gray-3 text-frame-white rounded-none">
            <DropdownMenuLabel className="font-frame-mono text-[0.62rem] tracking-[0.15em] text-frame-gray-light uppercase">
              {t("app.studio.projectSelector.yourProjects") as string}
            </DropdownMenuLabel>
            
            {isLoading && projects.length === 0 ? (
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-frame-gray-light font-frame-mono">
                <Loader2 className="w-3 h-3 animate-spin text-frame-orange" />
                {t("app.studio.loading") as string}
              </div>
            ) : projects.length === 0 ? (
              <div className="px-2 py-2 text-xs text-frame-gray-light font-light italic">
                {t("app.studio.projectSelector.noProjects") as string}
              </div>
            ) : (
              <div className="max-h-[180px] overflow-y-auto">
                {projects.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => handleSelectProject(p.id)}
                    className={`flex items-center gap-2 text-xs py-2 px-2.5 cursor-pointer rounded-none hover:bg-frame-gray-2 focus:bg-frame-gray-2 ${
                      activeProject?.id === p.id ? "text-frame-orange bg-[rgba(255,77,0,0.05)] font-medium" : "text-frame-gray-light"
                    }`}
                  >
                    <Folder className={`w-3 h-3 shrink-0 ${activeProject?.id === p.id ? "text-frame-orange" : ""}`} />
                    <span className="truncate">{p.name}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            )}

            <DropdownMenuSeparator className="bg-frame-gray-3" />

            {activeProject && (
              <DropdownMenuItem
                onClick={() => handleSelectProject(null)}
                className="flex items-center gap-2 text-xs py-2 px-2.5 text-frame-gray-light cursor-pointer rounded-none hover:bg-frame-gray-2 focus:bg-frame-gray-2"
              >
                <X className="w-3 h-3 text-frame-red" />
                {t("app.studio.projectSelector.deactivate") as string}
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={() => {
                setName("");
                setDescription("");
                setIsCreateOpen(true);
              }}
              className="flex items-center gap-2 text-xs py-2 px-2.5 text-frame-orange font-frame-mono tracking-wide cursor-pointer rounded-none hover:bg-frame-gray-2 focus:bg-frame-gray-2"
            >
              <Plus className="w-3 h-3" />
              {t("app.studio.projectSelector.newProject") as string}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {activeProject && (
          <div className="flex gap-0.5 shrink-0">
            <button
              type="button"
              onClick={openEditDialog}
              className="p-2 border border-frame-gray-3 bg-frame-gray-1/80 text-frame-gray-light hover:text-frame-white hover:border-frame-gray-light transition rounded-none cursor-pointer outline-none"
              title={t("app.studio.projectSelector.editMetadata") as string}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="p-2 border border-frame-gray-3 bg-frame-gray-1/80 text-frame-gray-light hover:text-frame-red hover:border-frame-red/40 transition rounded-none cursor-pointer outline-none"
              title={t("app.studio.projectSelector.deleteProject") as string}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* CREATE DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-sm rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="font-frame-display text-2xl tracking-wider text-frame-white">
              {t("app.studio.metadataModal.createTitle") as string}
            </DialogTitle>
            <DialogDescription className="font-frame-body text-xs text-frame-gray-light">
              {t("app.studio.projectSelector.createDesc") as string}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                {t("app.studio.projectSelector.projectName") as string}
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                placeholder={t("app.studio.projectSelector.namePlaceholder") as string}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2.5 font-frame-body text-[0.83rem] outline-none transition focus:border-frame-orange rounded-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                {t("app.studio.projectSelector.projectDescription") as string}
              </label>
              <textarea
                placeholder={t("app.studio.projectSelector.descPlaceholder") as string}
                disabled={isSubmitting}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2.5 font-frame-body text-[0.83rem] outline-none transition resize-none h-[75px] focus:border-frame-orange rounded-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-frame-gray-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsCreateOpen(false)}
                className="frame-btn-ghost !py-2 !px-4 !text-[0.62rem]"
              >
                {t("app.common.cancel") as string}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="frame-btn-primary !py-2 !px-4 !text-[0.62rem] flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t("app.studio.projectSelector.creating") as string}
                  </>
                ) : (
                  t("app.studio.projectSelector.createProject") as string
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-sm rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="font-frame-display text-2xl tracking-wider text-frame-white">
              {t("app.studio.metadataModal.editTitle") as string}
            </DialogTitle>
            <DialogDescription className="font-frame-body text-xs text-frame-gray-light">
              {t("app.studio.projectSelector.editDesc") as string}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                {t("app.studio.projectSelector.projectName") as string}
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2.5 font-frame-body text-[0.83rem] outline-none transition focus:border-frame-orange rounded-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-frame-mono text-[0.64rem] tracking-[0.15em] text-frame-orange uppercase">
                {t("app.studio.projectSelector.projectDescription") as string}
              </label>
              <textarea
                disabled={isSubmitting}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2.5 font-frame-body text-[0.83rem] outline-none transition resize-none h-[75px] focus:border-frame-orange rounded-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-frame-gray-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsEditOpen(false)}
                className="frame-btn-ghost !py-2 !px-4 !text-[0.62rem]"
              >
                {t("app.common.cancel") as string}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="frame-btn-primary !py-2 !px-4 !text-[0.62rem] flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t("app.studio.saving") as string}
                  </>
                ) : (
                  t("app.studio.projectSelector.saveChanges") as string
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-sm rounded-none p-6">
          <DialogHeader>
            <DialogTitle className="font-frame-display text-2xl tracking-wider text-frame-red">
              {t("app.studio.projectSelector.deleteTitle") as string}
            </DialogTitle>
            <DialogDescription className="font-frame-body text-xs text-frame-gray-light leading-relaxed">
              {t("app.studio.projectSelector.deleteWarning1") as string}{" "}
              <strong className="text-frame-white">"{activeProject?.name}"</strong> {t("app.studio.projectSelector.deleteWarning2") as string}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-frame-gray-2">
            <button
              type="button"
              disabled={isSubmitting}
                onClick={() => setIsDeleteOpen(false)}
                className="frame-btn-ghost !py-2 !px-4 !text-[0.62rem]"
              >
                {t("app.common.cancel") as string}
              </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDeleteConfirm}
              className="font-frame-mono text-[0.62rem] tracking-[0.12em] uppercase font-semibold text-frame-white bg-frame-red hover:bg-frame-red/80 py-2 px-4 transition duration-150 rounded-none cursor-pointer flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("app.studio.projectSelector.deleting") as string}
                </>
              ) : (
                t("app.studio.projectSelector.deleteConfirm") as string
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
