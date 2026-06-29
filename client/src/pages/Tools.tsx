import AppNavBar from "@/components/AppNavBar";
import { api } from "@/lib/api";
import { getToolIcon } from "@/lib/toolIcons";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { ToolFromApi } from "@/lib/api";
import { useProject } from "@/contexts/ProjectContext";

function ToolsContent() {
  const [, setLocation] = useLocation();
  const [tools, setTools] = useState<ToolFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeProject } = useProject();

  useEffect(() => {
    api.tools
      .list()
      .then(setTools)
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar ferramentas"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-glass-surface tools-glass-page min-h-screen text-frame-white">
      <AppNavBar />

      <section className="px-6 md:px-12 py-14 md:py-20">
        <p className="frame-label mb-3">// Ferramentas</p>
        <h1 className="frame-title text-[clamp(2.3rem,4.3vw,3.8rem)] text-frame-white mb-14">
          ESTÚDIO <em className="not-italic text-transparent [-webkit-text-stroke:1px_#f5f0e8]">IA</em>
        </h1>

        {loading && (
          <p className="font-frame-mono text-[0.65rem] tracking-[0.15em] uppercase text-frame-gray-light">
            Carregando ferramentas...
          </p>
        )}
        {error && <p className="text-frame-red font-frame-mono text-sm">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 xl:gap-4">
          {tools.map((tool) => {
            const Icon = getToolIcon(tool.slug);
            return (
              <div
                key={tool.id}
                className="frame-card cursor-pointer group"
                onClick={() => setLocation(`/tools/${tool.id}`)}
              >
                <Icon className="w-7 h-7 mb-3.5 text-frame-gray-light grayscale brightness-75 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-300" />
                <p className="font-frame-mono text-[0.64rem] tracking-[0.2em] text-frame-orange mb-2">
                  {tool.id}
                </p>
                <h3 className="frame-title text-[1.45rem] text-frame-white mb-2">{tool.name}</h3>
                <p className="text-[0.8rem] leading-relaxed text-frame-gray-light font-light mb-4 line-clamp-3">
                  {tool.description}
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {tool.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="frame-tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  className="frame-btn-ghost w-full !min-h-10 !py-2 !px-3.5 text-center transition group-hover:border-frame-orange/60 group-hover:text-frame-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(
                      activeProject
                        ? `/project/${activeProject.id}/studio/${tool.id}`
                        : `/studio/${tool.id}`,
                    );
                  }}
                >
                  Abrir no studio →
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default function Tools() {
  return (
    <ProtectedRoute>
      <ToolsContent />
    </ProtectedRoute>
  );
}
