import { useEffect, useState } from "react";
import { portalApi, type PortalFileSummary } from "../portalApi";
import PortalLayout from "../PortalLayout";

export default function PortalFiles() {
  const [files, setFiles] = useState<PortalFileSummary[] | null>(null);

  useEffect(() => {
    portalApi.files.list().then(setFiles).catch(() => setFiles([]));
  }, []);

  return (
    <PortalLayout>
      <p className="frame-label mb-2">// Drive</p>
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-frame-white mb-6">Arquivos</h1>

      {files === null && <p className="text-frame-gray-light">Carregando...</p>}
      {files?.length === 0 && <p className="text-frame-gray-light">Nenhum arquivo disponível ainda.</p>}

      <ul className="space-y-2">
        {files?.map((file) => (
          <li key={file.id} className="flex items-center justify-between border border-frame-gray-3 bg-frame-gray-1/30 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm text-frame-white truncate">{file.originalName}</p>
              <p className="font-frame-mono text-[0.6rem] uppercase text-frame-gray-light">{file.projectName}</p>
            </div>
            <a
              href={portalApi.files.downloadUrl(file.id)}
              className="font-frame-mono text-xs text-frame-orange hover:underline shrink-0 ml-3"
            >
              Baixar
            </a>
          </li>
        ))}
      </ul>
    </PortalLayout>
  );
}
