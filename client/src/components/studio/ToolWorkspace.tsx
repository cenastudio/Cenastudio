import { type ToolFromApi } from "@/lib/api";
import FormDispatcher from "./forms/FormDispatcher";
import { Loader2 } from "lucide-react";
import { useProject } from "@/contexts/ProjectContext";

interface ToolWorkspaceProps {
  tool: ToolFromApi;
  formData: Record<string, string>;
  onChangeField: (key: string, value: string) => void;
  onExecute: () => void;
  isProcessing: boolean;
  error: string | null;
  onSetOutput?: (output: string) => void;
}

export default function ToolWorkspace({
  tool,
  formData,
  onChangeField,
  onExecute,
  isProcessing,
  error,
  onSetOutput,
}: ToolWorkspaceProps) {
  const { autosaveStatus, activeProject } = useProject();

  const renderAutosaveStatus = () => {
    if (!activeProject) {
      return (
        <span className="font-frame-mono text-[0.52rem] text-frame-gray-muted">
          Estúdio de Pré-produção
        </span>
      );
    }

    switch (autosaveStatus) {
      case "saving":
        return (
          <span className="flex items-center gap-1.5 font-frame-mono text-[0.52rem] text-frame-orange animate-pulse">
            <span className="w-1 h-1 rounded-full bg-frame-orange" />
            Salvando...
          </span>
        );
      case "saved":
        return (
          <span className="flex items-center gap-1.5 font-frame-mono text-[0.52rem] text-[#00c864] transition-all duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c864]" />
            Salvo
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1.5 font-frame-mono text-[0.52rem] text-frame-red">
            <span className="w-1.5 h-1.5 rounded-full bg-frame-red animate-ping" />
            Erro ao salvar
          </span>
        );
      case "idle":
      default:
        return (
          <span className="flex items-center gap-1.5 font-frame-mono text-[0.52rem] text-frame-gray-light">
            <span className="w-1 h-1 rounded-full bg-frame-gray-muted" />
            Pronto
          </span>
        );
    }
  };

  return (
    <div className="w-full lg:w-[360px] shrink-0 p-5 md:p-6 overflow-y-auto border-b lg:border-b-0 lg:border-r border-frame-gray-2 flex flex-col justify-between h-full bg-frame-black select-none">
      <div className="space-y-4">
        {/* Workspace Title & Input Marker */}
        <div className="flex justify-between items-center border-b border-frame-gray-3 pb-2 mb-2">
          <span className="font-frame-mono text-[0.62rem] tracking-[0.18em] uppercase text-frame-orange font-semibold">
            Input Params
          </span>
          {renderAutosaveStatus()}
        </div>

        {/* Specialized Form Dispatcher */}
        <div className="space-y-4">
          <FormDispatcher
            slug={tool.slug}
            data={formData}
            onChange={onChangeField}
            onSetOutput={onSetOutput}
          />
        </div>

        {/* Error Notice */}
        {error && (
          <p className="text-frame-red font-frame-mono text-[0.65rem] mt-2 border border-frame-red/20 bg-frame-red/5 p-2 rounded-sm leading-relaxed">
            ⚠ {error}
          </p>
        )}
      </div>

      {/* Execution Button */}
      {tool.slug !== "checklist" && (
        <div className="pt-4 mt-4 border-t border-frame-gray-2">
          <button
            type="button"
            onClick={onExecute}
            disabled={isProcessing}
            className="w-full bg-frame-orange text-frame-black border-none py-3 font-frame-mono text-[0.72rem] tracking-[0.15em] uppercase font-semibold transition hover:bg-frame-orange-dark disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer rounded-none"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando IA...
              </>
            ) : (
              <>▶ Executar motor IA</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
