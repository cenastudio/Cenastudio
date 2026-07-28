import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { portalApi, type PortalProjectSummary } from "../portalApi";
import PortalLayout from "../PortalLayout";

export default function PortalDashboard() {
  const [projects, setProjects] = useState<PortalProjectSummary[] | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    portalApi.projects.list().then(setProjects).catch(() => setProjects([]));
  }, []);

  return (
    <PortalLayout>
      <p className="frame-label mb-2">// Seus projetos</p>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-frame-white mb-6">Projetos</h1>

      {projects === null && <p className="text-frame-gray-light">Carregando...</p>}

      {projects?.length === 0 && (
        <div className="border border-frame-gray-3 bg-frame-gray-1/30 p-8 text-center">
          <p className="text-frame-gray-light">Nenhum projeto vinculado ainda.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {projects?.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => setLocation(`/portal/projects/${project.id}`)}
            className="text-left border border-frame-gray-3 bg-frame-gray-1/30 p-5 hover:border-frame-orange/50 transition"
          >
            <p className="font-semibold text-frame-white mb-1">{project.name}</p>
            <p className="font-frame-mono text-[0.65rem] uppercase text-frame-gray-light mb-3">{project.status}</p>
            <div className="h-1.5 bg-frame-gray-3 overflow-hidden">
              <div className="h-full bg-frame-orange" style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} />
            </div>
            <p className="font-frame-mono text-[0.6rem] text-frame-gray-light mt-1">{project.progress}% concluído</p>
          </button>
        ))}
      </div>
    </PortalLayout>
  );
}
