import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { portalApi, type PortalFileSummary, type PortalProjectSummary } from "../portalApi";
import PortalLayout from "../PortalLayout";

export default function PortalProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const [project, setProject] = useState<PortalProjectSummary | null>(null);
  const [files, setFiles] = useState<PortalFileSummary[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    portalApi.projects
      .get(projectId)
      .then(setProject)
      .catch(() => setNotFound(true));
    portalApi.files
      .list()
      .then((all) => setFiles(all.filter((f) => f.projectId === projectId)))
      .catch(() => setFiles([]));
  }, [projectId]);

  if (notFound) {
    return (
      <PortalLayout>
        <p className="text-frame-gray-light">Projeto não encontrado.</p>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      {project && (
        <>
          <p className="frame-label mb-2">// Projeto</p>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-frame-white mb-2">{project.name}</h1>
          <p className="font-frame-mono text-xs uppercase text-frame-gray-light mb-6">{project.status}</p>

          <div className="h-2 bg-frame-gray-3 overflow-hidden mb-8">
            <div className="h-full bg-frame-orange" style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} />
          </div>

          <h2 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light mb-3">
            Arquivos deste projeto
          </h2>
          {files.length === 0 && <p className="text-frame-gray-light text-sm">Nenhum arquivo ainda.</p>}
          <ul className="space-y-2">
            {files.map((file) => (
              <li key={file.id} className="flex items-center justify-between border border-frame-gray-3 bg-frame-gray-1/30 px-4 py-3">
                <span className="text-sm text-frame-white truncate">{file.originalName}</span>
                <a
                  href={portalApi.files.downloadUrl(file.id)}
                  className="font-frame-mono text-xs text-frame-orange hover:underline shrink-0 ml-3"
                >
                  Baixar
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </PortalLayout>
  );
}
