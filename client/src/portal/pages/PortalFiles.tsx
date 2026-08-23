import { useEffect, useState } from "react";
import { portalApi, type PortalFileSummary } from "../portalApi";
import PortalLayout from "../PortalLayout";
import { formatPortalDate, PortalEmptyState, PortalPageHeader } from "../portalUi";

export default function PortalFiles() {
  const [files, setFiles] = useState<PortalFileSummary[] | null>(null);

  useEffect(() => {
    portalApi.files.list().then(setFiles).catch(() => setFiles([]));
  }, []);

  return (
    <PortalLayout>
      <PortalPageHeader
        eyebrow="Drive"
        title="Arquivos liberados"
        description="Tudo que o estudio compartilhou com voce, organizado por projeto e pronto para download."
      />

      {files === null && <p className="text-frame-gray-light">Carregando…</p>}
      {files?.length === 0 && (
        <PortalEmptyState
          title="Nenhum arquivo disponivel ainda."
          description="Quando houver entregas, documentos ou referencias liberadas, elas aparecem aqui com link de download."
        />
      )}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {files?.map((file) => (
          <li key={file.id} className="border border-frame-gray-3 bg-frame-gray-1/30 p-4">
            <div className="min-w-0 min-h-[92px]">
              <p className="text-sm font-medium text-frame-white truncate">{file.originalName}</p>
              <p className="font-frame-mono text-[0.6rem] uppercase text-frame-gray-light mt-1 truncate">{file.projectName}</p>
              <p className="text-xs text-frame-gray-light mt-3">{formatPortalDate(file.createdAt)}</p>
            </div>
            <a
              href={portalApi.files.downloadUrl(file.id)}
              className="mt-3 inline-flex min-h-11 items-center justify-center w-full border border-frame-orange/40 font-frame-mono text-xs text-frame-orange hover:bg-frame-orange/10 transition"
            >
              Baixar
            </a>
          </li>
        ))}
      </ul>
    </PortalLayout>
  );
}
