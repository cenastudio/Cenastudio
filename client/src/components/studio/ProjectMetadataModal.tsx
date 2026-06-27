import React, { useState, useEffect } from "react";
import { useProject } from "@/contexts/ProjectContext";
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

      toast.success("Escopo do projeto atualizado com sucesso!");
      onOpenChange(false);
    } catch {
      toast.error("Ocorreu um erro ao atualizar os metadados do projeto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-frame-black border-frame-gray-3 text-frame-white max-w-md rounded-none p-6 overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="font-frame-display text-2xl tracking-wider text-frame-white">
            METAS CRIATIVAS DO DIRETOR
          </DialogTitle>
          <DialogDescription className="font-frame-body text-xs text-frame-gray-light leading-relaxed">
            Configure as metas de produção e o perfil artístico deste projeto. Estas informações servirão como contexto global na Etapa 4.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          {/* Seção 1: Identificação Básica */}
          <div className="border-b border-frame-gray-2 pb-3 mb-2">
            <span className="block font-frame-mono text-[0.62rem] tracking-[0.2em] text-frame-orange uppercase mb-3">
              // Identificação do Projeto
            </span>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  Nome do Projeto *
                </label>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="ex: Videoclipe Retrofuturista"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 md:p-2.5 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  Descrição
                </label>
                <textarea
                  placeholder="Sinopse, resumo criativo ou considerações gerais da produtora..."
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
              // Especificações Cinematográficas
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  Formato Audiovisual
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="ex: Curta-Metragem, Comercial"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  Cliente / Marca
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="ex: Universal Music, Coca-Cola"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  Tom / Gênero Artístico
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="ex: Sci-Fi Noir, Cyberpunk"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                  Câmera / Lentes
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="ex: Arri Alexa, Anamórficas"
                  value={cameraModel}
                  onChange={(e) => setCameraModel(e.target.value)}
                  className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white p-2 font-frame-body text-[0.8rem] outline-none transition focus:border-frame-orange rounded-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.1em] text-frame-white uppercase font-medium">
                Orçamento Estimado
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                placeholder="ex: R$ 50.000, US$ 10,000"
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
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="frame-btn-primary !py-2 !px-4 !text-[0.62rem] flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Confirmar Metas"
              )}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
