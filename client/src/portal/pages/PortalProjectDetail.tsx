import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { portalApi, type PortalFileSummary, type PortalProjectSummary } from "../portalApi";
import PortalLayout from "../PortalLayout";
import { formatPortalDate, PortalEmptyState, PortalPageHeader, PortalStatCard, portalStatusLabel } from "../portalUi";

const PROJECT_STEPS = [
  { min: 0, label: "Entrada" },
  { min: 20, label: "Planejamento" },
  { min: 45, label: "Producao" },
  { min: 70, label: "Revisao" },
  { min: 90, label: "Entrega" },
];

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
        <PortalEmptyState
          title="Projeto nao encontrado."
          description="Este projeto nao esta disponivel para este acesso do portal."
        />
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      {project && (
        <>
          <PortalPageHeader
            eyebrow="Projeto"
            title={project.name}
            description="Acompanhe o andamento, veja a etapa atual e baixe os arquivos liberados pelo estudio."
          />

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <PortalStatCard label="Status" value={portalStatusLabel(project.status)} />
            <PortalStatCard label="Progresso" value={`${project.progress}%`} />
            <PortalStatCard label="Prazo" value={formatPortalDate(project.deadline)} />
            <PortalStatCard label="Arquivos" value={files.length} />
          </section>

          <section className="border border-frame-gray-3 bg-frame-gray-1/20 p-5 mb-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light">Linha do tempo</h2>
              <span className="font-frame-mono text-xs text-frame-orange">{project.progress}%</span>
            </div>
            <div className="h-2 bg-frame-gray-3 overflow-hidden mb-4">
              <div className="h-full bg-frame-orange" style={{ width: `${Math.min(100, Math.max(0, project.progress))}%` }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {PROJECT_STEPS.map((step) => {
                const isDone = project.progress >= step.min;
                return (
                  <div
                    key={step.label}
                    className={`border px-3 py-2 ${isDone ? "border-frame-orange/50 bg-frame-orange/[0.06]" : "border-frame-gray-3 bg-frame-black/40"}`}
                  >
                    <p className={`font-frame-mono text-[0.58rem] uppercase ${isDone ? "text-frame-orange" : "text-frame-gray-light"}`}>
                      {step.min}%
                    </p>
                    <p className="text-sm text-frame-white mt-1">{step.label}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-4 mb-3">
              <h2 className="font-frame-mono text-xs uppercase tracking-wider text-frame-gray-light">Arquivos deste projeto</h2>
              <span className="text-xs text-frame-gray-light">{files.length} liberados</span>
            </div>
            {files.length === 0 ? (
              <PortalEmptyState
                title="Nenhum arquivo liberado ainda."
                description="Assim que o estudio compartilhar roteiros, videos, propostas ou entregas, eles aparecem neste projeto."
              />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {files.map((file) => (
                  <li key={file.id} className="border border-frame-gray-3 bg-frame-gray-1/30 px-4 py-3">
                    <p className="text-sm text-frame-white truncate">{file.originalName}</p>
                    <p className="font-frame-mono text-[0.6rem] uppercase text-frame-gray-light mt-1">{formatPortalDate(file.createdAt)}</p>
                    <a
                      href={portalApi.files.downloadUrl(file.id)}
                      className="mt-3 inline-flex min-h-11 items-center font-frame-mono text-xs text-frame-orange hover:underline"
                    >
                      Baixar arquivo
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </PortalLayout>
  );
}
