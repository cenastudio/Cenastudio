import { useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, Download, FileText, History, MessageSquare, RefreshCw } from "lucide-react";

interface ActionToolbarProps {
  onCopy: () => void;
  onDownload: (format: "pdf" | "docx") => void;
  onClear: () => void;
  onToggleHistory: () => void;
  activeTab: "document" | "refine";
  onChangeTab: (tab: "document" | "refine") => void;
  hasOutput: boolean;
}

export default function ActionToolbar({
  onCopy,
  onDownload,
  onClear,
  onToggleHistory,
  activeTab,
  onChangeTab,
  hasOutput,
}: ActionToolbarProps) {
  const [downloadOpen, setDownloadOpen] = useState(false);
  const downloadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!downloadOpen) return;
    const close = (event: MouseEvent) => {
      if (!downloadRef.current?.contains(event.target as Node)) setDownloadOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [downloadOpen]);

  return (
    <div className="px-6 py-3 border-b border-frame-gray-2 flex flex-wrap items-center justify-between gap-3 bg-frame-gray-1/40 shrink-0 select-none">
      {/* Segmented Tab Selector (Document vs Refinement Chat) */}
      <div className="flex bg-frame-gray-1 p-0.5 border border-frame-gray-3">
        <button
          type="button"
          onClick={() => onChangeTab("document")}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-frame-mono text-[0.6rem] tracking-[0.1em] uppercase transition ${
            activeTab === "document"
              ? "bg-frame-orange text-frame-black font-medium"
              : "text-frame-gray-light hover:text-frame-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Documento
        </button>
        <button
          type="button"
          onClick={() => onChangeTab("refine")}
          className={`flex items-center gap-1.5 px-3 py-1.5 font-frame-mono text-[0.6rem] tracking-[0.1em] uppercase transition ${
            activeTab === "refine"
              ? "bg-frame-orange text-frame-black font-medium"
              : "text-frame-gray-light hover:text-frame-white"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Refinar com IA
        </button>
      </div>

      {/* Operation Actions */}
      <div className="flex items-center gap-1.5">
        {hasOutput && (
          <>
            <button
              type="button"
              onClick={onCopy}
              title="Copiar para clipboard"
              className="font-frame-mono text-[0.6rem] tracking-[0.1em] uppercase px-3 py-2 border border-frame-gray-3 text-frame-gray-light bg-transparent transition hover:border-frame-gray-muted hover:text-frame-white flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copiar</span>
            </button>
            <div ref={downloadRef} className="relative">
              <button
                type="button"
                onClick={() => setDownloadOpen((open) => !open)}
                title="Exportar documento"
                className="font-frame-mono text-[0.6rem] tracking-[0.1em] uppercase px-3 py-2 border border-frame-gray-3 text-frame-gray-light bg-transparent transition hover:border-frame-gray-muted hover:text-frame-white flex items-center gap-1.5"
                aria-expanded={downloadOpen}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exportar</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {downloadOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-44 border border-frame-gray-3 bg-frame-black p-1.5 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => { onDownload("pdf"); setDownloadOpen(false); }}
                    className="flex min-h-10 w-full items-center px-3 font-frame-mono text-[0.6rem] uppercase text-frame-gray-light hover:bg-frame-gray-2 hover:text-frame-white"
                  >
                    PDF pronto para enviar
                  </button>
                  <button
                    type="button"
                    onClick={() => { onDownload("docx"); setDownloadOpen(false); }}
                    className="flex min-h-10 w-full items-center px-3 font-frame-mono text-[0.6rem] uppercase text-frame-gray-light hover:bg-frame-gray-2 hover:text-frame-white"
                  >
                    Word editável (.docx)
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onClear}
          title="Limpar todos os campos"
          className="font-frame-mono text-[0.6rem] tracking-[0.1em] uppercase px-3 py-2 border border-frame-gray-3 text-frame-gray-light bg-transparent transition hover:border-frame-red/40 hover:text-frame-red flex items-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Limpar</span>
        </button>

        <button
          type="button"
          onClick={onToggleHistory}
          title="Ver histórico de gerações"
          className="font-frame-mono text-[0.6rem] tracking-[0.1em] uppercase px-3 py-2 border border-frame-gray-3 text-frame-gray-light bg-transparent transition hover:border-frame-gold/40 hover:text-frame-gold flex items-center gap-1.5"
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Histórico</span>
        </button>
      </div>
    </div>
  );
}
