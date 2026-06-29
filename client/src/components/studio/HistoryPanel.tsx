import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Loader2, X, RefreshCw, Eye } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface HistoryItem {
  id: number;
  toolId: string;
  input: string; // JSON serialized string
  output: string;
  createdAt: string;
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  toolId: string;
  onRestore: (input: Record<string, string>, output: string) => void;
}

export default function HistoryPanel({ isOpen, onClose, toolId, onRestore }: HistoryPanelProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const historyData = await api.ai.history(toolId);
        setItems(historyData);
      } catch (e) {
        toast.error(t("app.studio.historyLoading") as string);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isOpen, toolId]);

  if (!isOpen) return null;

  return (
    <div className="w-full lg:w-80 shrink-0 border-l border-frame-gray-2 bg-frame-gray-1 flex flex-col h-full overflow-hidden select-none">
      {/* Header */}
      <div className="px-4 py-4 border-b border-frame-gray-2 flex items-center justify-between bg-frame-black/30 shrink-0">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-frame-gold animate-spin-slow" />
          <span className="font-frame-mono text-[0.68rem] tracking-[0.15em] uppercase text-frame-gold font-medium">
            {t("app.studio.historyTitle") as string}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-frame-gray-light hover:text-frame-white transition p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* List Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
            <Loader2 className="w-6 h-6 animate-spin text-frame-orange" />
            <span className="font-frame-mono text-[0.64rem] uppercase tracking-wider text-frame-gray-light">
              {t("app.studio.historyLoading") as string}
            </span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 opacity-30 flex flex-col items-center justify-center gap-2">
            <span className="text-3xl">📁</span>
            <p className="font-frame-mono text-[0.64rem] uppercase tracking-widest text-frame-gray-light leading-relaxed">
              {t("app.studio.historyEmpty") as string}
              <br />
              {t("app.studio.historyEmpty2") as string}
            </p>
          </div>
        ) : (
          items.map((item) => {
            let parsedInput: Record<string, string> = {};
            try {
              parsedInput = JSON.parse(item.input);
            } catch {
              parsedInput = { prompt: item.input };
            }

            // Extract display title or description from input
            const firstInputValue =
              parsedInput.titulo ||
              parsedInput.projectName ||
              parsedInput.cena ||
              parsedInput.prompt ||
              Object.values(parsedInput)[0] ||
              t("app.studio.generationUntitled") as string;

            const formattedDate = new Date(item.createdAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={item.id}
                className="bg-frame-gray-2/60 border border-frame-gray-3 p-3.5 hover:border-frame-gold/45 transition-colors group flex flex-col justify-between gap-3 text-left relative overflow-hidden"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-frame-mono text-[0.64rem] text-frame-gray-light">
                      {formattedDate}
                    </span>
                    <span className="font-frame-mono text-[0.62rem] text-frame-gold/70 bg-frame-gold/5 border border-frame-gold/10 px-1.5 py-0.5 rounded-sm">
                      #{item.id}
                    </span>
                  </div>
                  <h4 className="text-[0.76rem] text-frame-white font-medium line-clamp-1 mt-1 font-frame-body">
                    {firstInputValue}
                  </h4>
                  <p className="text-[0.66rem] text-frame-gray-light line-clamp-2 mt-1.5 font-light leading-normal">
                    {item.output}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onRestore(parsedInput, item.output);
                    toast.success(`${t("app.studio.generationRestored") as string} #${item.id}`);
                  }}
                  className="w-full py-1.5 font-frame-mono text-[0.64rem] tracking-[0.1em] uppercase border border-frame-gray-3 text-frame-gray-light bg-transparent transition hover:border-frame-gold hover:text-frame-gold hover:bg-frame-gold/5 flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {t("app.studio.viewRestore") as string}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
