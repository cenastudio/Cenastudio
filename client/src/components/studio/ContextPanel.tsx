import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";

const FREE_MODELS = [
  { id: "", label: "Auto (inteligente)" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", label: "Nemotron Ultra 550B (criativo)" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron Super 120B (marketing)" },
  { id: "poolside/laguna-m.1:free", label: "Laguna M.1 (cálculos)" },
];

export default function ContextPanel() {
  const { plan } = useAuth();
  const { t } = useLanguage();
  const [model, setModel] = useState(() => localStorage.getItem("cena-ai-model") || "");

  if (!plan) return null;

  const handleModelChange = (value: string) => {
    setModel(value);
    localStorage.setItem("cena-ai-model", value);
    // Dispatch event so StudioShell picks it up
    window.dispatchEvent(new CustomEvent("cena:model-change", { detail: value }));
  };

  return (
    <div className="mt-auto px-[18px] py-4 border-t border-frame-gray-3 bg-frame-black/50 shrink-0 space-y-3">
      {/* Model selector */}
      <div>
        <label className="flex items-center gap-2 text-frame-gray-light mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-frame-orange animate-pulse" />
          <span className="font-frame-mono text-[0.58rem] tracking-wider uppercase">Modelo IA</span>
        </label>
        <select
          value={model}
          onChange={(e) => handleModelChange(e.target.value)}
          className="w-full bg-frame-gray-1 border border-frame-gray-3 text-frame-white px-2 py-1.5 text-[0.7rem] font-frame-mono outline-none focus:border-frame-orange transition"
        >
          {FREE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Plan info */}
      <div className="text-[0.63rem] font-frame-mono text-frame-gray-light flex flex-col gap-1">
        <div className="flex justify-between">
          <span>{t("app.studio.context.plan") as string}</span>
          <span className="text-frame-white font-medium">{plan.planName}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("app.studio.context.quota") as string}</span>
          <span className="text-frame-orange">
            {plan.generationLimit === -1 ? t("app.studio.context.unlimited") as string : `${plan.generationLimit} ${t("app.studio.context.generations") as string}`}
          </span>
        </div>
      </div>
    </div>
  );
}
