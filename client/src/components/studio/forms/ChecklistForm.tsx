import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Copy, Trash2, CheckSquare, Square } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const CHECKLIST_ITEMS: Record<string, string[]> = {
  camera: [
    "Câmera principal + backup testada",
    "Baterias carregadas (mín. 4)",
    "Cartões de memória formatados e vazios",
    "Lentes limpas (wide, normal, tele)",
    "Filtros ND (ND4, ND8, ND64) higienizados",
    "Tripé com cabeça fluida regulada",
    "Monopé / Shoulder rig de suporte",
    "Gimbal/Steadicam calibrado e carregado",
    "Monitor externo + cabos HDMI testados",
    "Carregador de baterias + cabos USB-C extras",
    "Panos de microfibra e pera de ar",
    "Mochila / Case de transporte rígido",
  ],
  audio: [
    "Microfone shotgun (direcional câmera)",
    "Microfone boom + vara de sustentação",
    "Microfones de lapela sem fio (wireless)",
    "Gravador de áudio externo (Zoom H6 etc.)",
    "Fones de ouvido isolados para monitoramento",
    "Cabos XLR testados (mín. 4 unidades)",
    "Baterias e pilhas recarregáveis extras",
    "Protetor de vento (dead cat)",
    "Claquete (sincronização física no set)",
    "Espumas de reposição e fitas adesivas",
  ],
  luz: [
    "Luz principal (key light de LED)",
    "Luz de preenchimento (fill light) / rebatedor",
    "Luz de contra (backlight / rim light)",
    "Difusores e softboxes de suavização",
    "Rebatedores portáteis (branco/prata/dourado)",
    "Extensões elétricas robustas (mín. 3 de 10m)",
    "Dimmer / controle de potência",
    "Gelatinas corretoras (CTO, CTB, ND)",
    "Bandeiras de luz / flags para bloqueio",
    "Verificar voltagem das tomadas da locação",
  ],
  prod: [
    "Callsheet impresso para toda a equipe",
    "Roteiro e decupagem técnica impressos",
    "Contatos de emergência salvos e impressos",
    "Autorização de locação assinada pelas partes",
    "Autorizações de imagem e voz assinadas pelo elenco",
    "Kit de primeiros socorros completo",
    "Fita gaffer de alta resistência (preta e prata)",
    "Fita crepe ou fita de pintor colorida",
    "Walkie-talkies / Rádios carregados",
    "Pranchetas e canetas de produção",
    "Água mineral fresca e lanches/snacks para a equipe",
    "Dinheiro em espécie (caixa de set emergencial)",
  ],
  pos: [
    "HDs externos / SSDs portáteis formatados e testados",
    "Notebook/Workstation de backup em campo",
    "Leitores de cartão (SD, CFexpress, microSD)",
    "Software de edição atualizado (Premiere/DaVinci)",
    "LUTs de visualização e monitoramento salvas",
    "Estrutura de pastas do projeto organizada",
    "Contrato de entrega e prazos assinados",
    "Briefing de edição e corte alinhado",
    "Canais de entrega confirmados (Drive, Frame.io)",
  ],
};

interface ChecklistFormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onSetOutput?: (output: string) => void;
}

export default function ChecklistForm({ data, onChange, onSetOutput }: ChecklistFormProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("camera");
  const [checkedState, setCheckedState] = useState<Record<string, Record<number, boolean>>>({});
  const [aiInput, setAiInput] = useState("");
  const [aiOutput, setAiOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Load checklist states from localStorage on mount
  useEffect(() => {
    const loaded: Record<string, Record<number, boolean>> = {};
    ["camera", "audio", "luz", "prod", "pos"].forEach((tab) => {
      try {
        const item = localStorage.getItem(`cl-state-${tab}`);
        loaded[tab] = item ? JSON.parse(item) : {};
      } catch {
        loaded[tab] = {};
      }
    });
    setCheckedState(loaded);
  }, []);

  const toggleCheck = (tab: string, idx: number) => {
    const tabState = { ...checkedState[tab] };
    tabState[idx] = !tabState[idx];

    const newState = { ...checkedState, [tab]: tabState };
    setCheckedState(newState);
    localStorage.setItem(`cl-state-${tab}`, JSON.stringify(tabState));
  };

  const handleMarkAll = (v: boolean) => {
    const items = CHECKLIST_ITEMS[activeTab] || [];
    const tabState: Record<number, boolean> = {};
    items.forEach((_, i) => {
      tabState[i] = v;
    });

    const newState = { ...checkedState, [activeTab]: tabState };
    setCheckedState(newState);
    localStorage.setItem(`cl-state-${activeTab}`, JSON.stringify(tabState));
    toast.success(v ? t("app.studio.forms.checklist.allMarked") : t("app.studio.forms.checklist.allUnmarked"));
  };

  const handleResetAll = () => {
    const newState: Record<string, Record<number, boolean>> = {};
    ["camera", "audio", "luz", "prod", "pos"].forEach((tab) => {
      newState[tab] = {};
      localStorage.removeItem(`cl-state-${tab}`);
    });
    setCheckedState(newState);
    toast.success(t("app.studio.forms.checklist.allReset"));
  };

  const handleCopyClipboard = () => {
    const items = CHECKLIST_ITEMS[activeTab];
    if (!items) return;
    const tabState = checkedState[activeTab] || {};
    const text = `CHECKLIST — ${activeTab.toUpperCase()}\n\n` +
      items.map((it, i) => `[${tabState[i] ? "X" : " "}] ${it}`).join("\n");

    navigator.clipboard.writeText(text);
    toast.success(`Checklist ${activeTab} ${t("app.studio.forms.checklist.copied")}`);
  };

  const handleGenerateAIList = async () => {
    if (!aiInput.trim()) {
      toast.error(t("app.studio.forms.checklist.enterType"));
      return;
    }
    setIsGenerating(true);
    try {
      const result = await api.ai.generate("09", {
        prompt: `Gere um checklist de set personalizado para uma filmagem do tipo: ${aiInput}`,
      });
      setAiOutput(result.output);
      if (onSetOutput) {
        onSetOutput(result.output);
      }
      toast.success(t("app.studio.forms.checklist.generated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("app.studio.forms.checklist.generateError"));
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculations for progress
  const currentItems = CHECKLIST_ITEMS[activeTab] || [];
  const currentTabState = checkedState[activeTab] || {};
  const completedCount = currentItems.filter((_, i) => currentTabState[i]).length;
  const progressPercent = currentItems.length
    ? Math.round((completedCount / currentItems.length) * 100)
    : 0;

  const tabLabelMap: Record<string, string> = {
    camera: t("app.studio.forms.checklist.tabCamera"),
    audio: t("app.studio.forms.checklist.tabAudio"),
    luz: t("app.studio.forms.checklist.tabLight"),
    prod: t("app.studio.forms.checklist.tabProduction"),
    pos: t("app.studio.forms.checklist.tabPost"),
    ia: t("app.studio.forms.checklist.tabAI"),
  };

  return (
    <div className="space-y-4 font-frame-body">
      {/* Título & Tabs Internas */}
      <div className="flex bg-frame-gray-1 p-0.5 border border-frame-gray-3 overflow-x-auto select-none shrink-0 scrollbar-none">
        {["camera", "audio", "luz", "prod", "pos", "ia"].map((tab) => {
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-frame-mono text-[0.64rem] tracking-[0.1em] uppercase transition shrink-0 ${
                activeTab === tab
                  ? "bg-frame-orange text-frame-black font-medium"
                  : "text-frame-gray-light hover:text-frame-white"
              }`}
            >
              {tabLabelMap[tab]}
            </button>
          );
        })}
      </div>

      {/* Checklist Content */}
      {activeTab === "ia" ? (
        <div className="space-y-4 pt-1">
          <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-2">
            {t("app.studio.forms.checklist.sectionAI")}
          </p>
          <div className="space-y-3">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.checklist.productionType")}
              </label>
              <input
                type="text"
                value={aiInput}
                onChange={(e) => {
                  setAiInput(e.target.value);
                  onChange("prompt", `Gere um checklist de set personalizado para: ${e.target.value}`);
                }}
                placeholder="Ex: Casamento ao ar livre, comercial de moda em estúdio..."
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateAIList}
              disabled={isGenerating}
              className="w-full bg-frame-orange text-frame-black border-none py-2.5 font-frame-mono text-[0.66rem] tracking-[0.12em] uppercase font-medium transition hover:bg-frame-orange-dark disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("app.studio.forms.checklist.generating")}
                </>
              ) : (
                <>{t("app.studio.forms.checklist.generateButton")}</>
              )}
            </button>
          </div>

          {aiOutput && (
            <div className="p-3 bg-frame-gray-1 border border-frame-gray-2 overflow-y-auto max-h-[220px]">
              <pre className="text-[0.74rem] leading-relaxed text-frame-cream whitespace-pre-wrap font-frame-mono">
                {aiOutput}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 pt-1 select-none">
          {/* Progress bar */}
          <div className="flex items-center justify-between gap-3 text-frame-gray-light bg-frame-gray-1 border border-frame-gray-3 px-3 py-2 shrink-0">
            <span className="font-frame-mono text-[0.63rem] uppercase tracking-wider">
              {completedCount} / {currentItems.length} {t("app.studio.forms.checklist.completed")}
            </span>
            <div className="flex-1 max-w-[120px] bg-frame-gray-2 h-1.5 rounded-sm overflow-hidden">
              <div
                className="h-full bg-frame-orange transition-all duration-300 rounded-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="font-frame-mono text-[0.63rem] text-frame-orange font-semibold">
              {progressPercent}%
            </span>
          </div>

          {/* Checklist Operations */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 select-none">
            <button
              type="button"
              onClick={() => handleMarkAll(true)}
              className="py-1 font-frame-mono text-[0.62rem] uppercase border border-frame-gray-3 text-frame-gray-light bg-transparent hover:border-frame-gray-muted hover:text-frame-white transition"
            >
              {t("app.studio.forms.checklist.markAll")}
            </button>
            <button
              type="button"
              onClick={() => handleMarkAll(false)}
              className="py-1 font-frame-mono text-[0.62rem] uppercase border border-frame-gray-3 text-frame-gray-light bg-transparent hover:border-frame-gray-muted hover:text-frame-white transition"
            >
              {t("app.studio.forms.checklist.unmarkAll")}
            </button>
            <button
              type="button"
              onClick={handleCopyClipboard}
              className="py-1 font-frame-mono text-[0.62rem] uppercase border border-frame-gray-3 text-frame-gray-light bg-transparent hover:border-frame-gray-muted hover:text-frame-white transition flex items-center justify-center gap-1"
            >
              <Copy className="w-3 h-3" />
              {t("app.studio.forms.checklist.copy")}
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="py-1 font-frame-mono text-[0.62rem] uppercase border border-frame-gray-3 text-frame-gray-light bg-transparent hover:border-frame-red/45 hover:text-frame-red transition flex items-center justify-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              {t("app.studio.forms.checklist.resetAll")}
            </button>
          </div>

          {/* Checked Items List */}
          <div className="flex flex-col gap-1.5 max-h-[350px] overflow-y-auto pr-1">
            {currentItems.map((item, i) => {
              const isChecked = !!currentTabState[i];
              return (
                <div
                  key={i}
                  onClick={() => toggleCheck(activeTab, i)}
                  className={`flex items-start gap-2.5 p-2.5 border transition cursor-pointer select-none ${
                    isChecked
                      ? "bg-[rgba(0,200,100,0.02)] border-[rgba(0,200,100,0.15)] text-frame-gray-light line-through"
                      : "bg-frame-gray-1 border-frame-gray-2 text-frame-white hover:bg-frame-gray-1"
                  }`}
                >
                  <div className="pt-0.5 shrink-0">
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-frame-green" />
                    ) : (
                      <Square className="w-4 h-4 text-frame-gray-muted" />
                    )}
                  </div>
                  <label className="text-[0.76rem] font-light leading-normal cursor-pointer flex-1">
                    {item}
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
