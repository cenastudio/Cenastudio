import React, { useState, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/lib/api";

interface ProjectMetadataModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
}

interface CreativeGoals {
  format?: string;
  client?: string;
  tone?: string;
  cameraModel?: string;
  budget?: string;
}

interface ParsedMetadata {
  isPinned?: boolean;
  creativeGoals?: CreativeGoals;
}

export default function ProjectMetadataModal({
  isOpen,
  onOpenChange,
  project,
}: ProjectMetadataModalProps) {
  const { updateProject } = useProject();
  const { t } = useLanguage();

  // Basic Form States
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");

  // Cinematic Metadata States
  const [format, setFormat] = useState("");
  const [client, setClient] = useState("");
  const [tone, setTone] = useState("");
  const [cameraModel, setCameraModel] = useState("");
  const [budget, setBudget] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state with project on open/change
  useEffect(() => {
    setName(project.name);
    setDescription(project.description || "");

    try {
      const meta: ParsedMetadata = JSON.parse(project.metadataJson || "{}");
      const goals = meta.creativeGoals || {};
      setFormat(goals.format || "");
      setClient(goals.client || "");
      setTone(goals.tone || "");
      setCameraModel(goals.cameraModel || "");
      setBudget(goals.budget || "");
    } catch {
      setFormat("");
      setClient("");
      setTone("");
      setCameraModel("");
      setBudget("");
    }
  }, [project, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      // Parse current metadata to preserve existing fields like isPinned
      let meta: ParsedMetadata = {};
      try {
        meta = JSON.parse(project.metadataJson || "{}");
      } catch {
        meta = {};
      }

      // Build updated metadata with new creativeGoals
      const updatedMeta: ParsedMetadata = {
        ...meta,
        creativeGoals: {
          format: format.trim() || undefined,
          client: client.trim() || undefined,
          tone: tone.trim() || undefined,
          cameraModel: cameraModel.trim() || undefined,
          budget: budget.trim() || undefined,
        },
      };

      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
        metadataJson: JSON.stringify(updatedMeta),
      });

      toast.success(t("app.studio.metadataModal.updated") as string);
      onOpenChange(false);
    } catch {
      toast.error(t("app.studio.metadataModal.updateError") as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-frame-display text-2xl tracking-wider text-frame-white">
            {t("app.studio.metadataModal.title") as string}
          </DialogTitle>
          <DialogDescription className="font-frame-body text-xs text-frame-gray-light leading-relaxed">
            {t("app.studio.metadataModal.description") as string}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {/* Seção 1: Identificação Básica */}
          <div className="border-b border-frame-gray-2 pb-3 mb-2">
            <span className="block font-frame-mono text-[0.62rem] tracking-[0.2em] text-frame-orange uppercase mb-3">
              {t("app.studio.metadataModal.projectId") as string}
            </span>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  {t("app.studio.metadataModal.projectName") as string}
                </label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder={t("app.studio.metadataModal.namePlaceholder") as string}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 md:p-2.5 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  {t("app.studio.metadataModal.description") as string}
                </label>
                <textarea
                  placeholder={t("app.studio.metadataModal.descPlaceholder") as string}
                  disabled={isSubmitting}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 md:p-2.5 font-frame-body text-[0.8rem] outline-none transition resize-none h-[65px] focus:border-frame-orange rounded-none"
                />
              </div>
            </div>
          </div>

          {/* Seção 2: Especificações de Produção */}
          <div className="space-y-3">
            <span className="block font-frame-mono text-[0.62rem] tracking-[0.2em] text-frame-orange uppercase">
              {t("app.studio.metadataModal.cinematicSpecs") as string}
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  {t("app.studio.metadataModal.audiovisualFormat") as string}
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder={t("app.studio.metadataModal.formatPlaceholder") as string}
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  {t("app.studio.metadataModal.clientBrand") as string}
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder={t("app.studio.metadataModal.clientPlaceholder") as string}
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  {t("app.studio.metadataModal.toneGenre") as string}
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder={t("app.studio.metadataModal.tonePlaceholder") as string}
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  {t("app.studio.metadataModal.cameraLens") as string}
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder={t("app.studio.metadataModal.cameraPlaceholder") as string}
                  value={cameraModel}
                  onChange={(e) => setCameraModel(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                {t("app.studio.metadataModal.estimatedBudget") as string}
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                placeholder={t("app.studio.metadataModal.budgetPlaceholder") as string}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-frame-gray-2 mt-4">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
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
                t("app.studio.metadataModal.confirmGoals") as string
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
