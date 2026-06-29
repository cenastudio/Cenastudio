import { useProject } from "@/contexts/ProjectContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Project } from "@/lib/api";
import { FolderKanban, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface ProjectGatewayProps {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  routeBase: "files" | "video-reviews";
}

export default function ProjectGateway({
  eyebrow,
  title,
  description,
  actionLabel,
  routeBase,
}: ProjectGatewayProps) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { projects, isLoading, createProject } = useProject();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const openProject = (project: Project) => {
    setLocation(`/${routeBase}/${project.id}`);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t("app.common.projectNameRequired") as string);
      return;
    }

    setIsCreating(true);
    try {
      const project = await createProject(name.trim(), `Criado a partir de ${title.toLowerCase()}`);
      setName("");
      openProject(project);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 md:py-16 space-y-8">
      <div className="border-b border-frame-gray-3 pb-6">
        <p className="frame-label mb-2">{eyebrow}</p>
        <h1 className="frame-title text-[clamp(2.2rem,4vw,3.6rem)]">{title}</h1>
        <p className="text-frame-gray-light text-sm mt-3 max-w-2xl">{description}</p>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-6">
        <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-frame-mono text-[0.72rem] tracking-[0.18em] uppercase">
                {t("app.common.chooseProject") as string}
              </h2>
              <p className="text-frame-gray-light text-sm mt-1">
                {t("app.common.projectRequiredInfo") as string}
              </p>
            </div>
            {isLoading && <Loader2 className="w-5 h-5 animate-spin text-frame-orange" />}
          </div>

          {projects.length === 0 && !isLoading ? (
            <div className="border border-dashed border-frame-gray-3 p-10 text-center">
              <FolderKanban className="w-10 h-10 text-frame-orange mx-auto mb-3" />
              <p className="text-frame-gray-light text-sm">
                {t("app.common.noProjects") as string}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => openProject(project)}
                  className="text-left border border-frame-gray-3 bg-frame-black/30 p-4 hover:border-frame-orange hover:bg-frame-orange/[0.04] transition"
                >
                  <span className="font-frame-mono text-[0.64rem] tracking-[0.16em] text-frame-orange">
                    PROJETO #{project.id}
                  </span>
                  <h3 className="frame-title text-[1.45rem] mt-2">{project.name}</h3>
                  <p className="text-frame-gray-light text-xs line-clamp-2 mt-1">
                    {project.description || t("app.common.noDescription") as string}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border border-frame-gray-3 bg-frame-gray-1/20 p-6 space-y-4">
          <div>
            <h2 className="font-frame-mono text-[0.72rem] tracking-[0.18em] uppercase">
              {t("app.common.newProjectQuick") as string}
            </h2>
            <p className="text-frame-gray-light text-sm mt-1">
              {t("app.common.quickCreateInfo") as string}
            </p>
          </div>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleCreate();
            }}
            placeholder={t("app.common.projectPlaceholder") as string}
            className="frame-input w-full"
          />
          <button
            type="button"
            disabled={isCreating}
            onClick={handleCreate}
            className="frame-btn-primary w-full flex items-center justify-center gap-2"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {actionLabel}
          </button>
        </div>
      </section>
    </main>
  );
}
