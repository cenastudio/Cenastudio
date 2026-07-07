import { useLanguage } from "@/contexts/LanguageContext";

interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function DecupagemForm({ data, onChange }: FormProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* Seção 1: Cena */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.decupagem.sectionScene")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.decupagem.sceneDescription")}
            </label>
            <textarea
              value={data.cena || ""}
              onChange={(e) => onChange("cena", e.target.value)}
              placeholder="Ex: Perseguição em rua movimentada, noturno, 2 personagens..."
              rows={3}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.decupagem.estimatedShots")}
              </label>
              <input
                type="number"
                value={data.planos || "10"}
                onChange={(e) => onChange("planos", e.target.value)}
                placeholder="10"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.decupagem.estimatedDuration")}
              </label>
              <input
                type="text"
                value={data.duracao || ""}
                onChange={(e) => onChange("duracao", e.target.value)}
                placeholder="Ex: 2 min"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Câmera */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.decupagem.sectionCamera")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.decupagem.cameraModel")}
            </label>
            <input
              type="text"
              value={data.camera || ""}
              onChange={(e) => onChange("camera", e.target.value)}
              placeholder="Ex: Sony FX3, RED Komodo, ARRI Alexa Mini"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.decupagem.movementStyle")}
            </label>
            <select
              value={data.estilo || t("app.studio.forms.decupagem.optMixed")}
              onChange={(e) => onChange("estilo", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.decupagem.optHandheld")}>{t("app.studio.forms.decupagem.optHandheld")}</option>
              <option value={t("app.studio.forms.decupagem.optTripod")}>{t("app.studio.forms.decupagem.optTripod")}</option>
              <option value={t("app.studio.forms.decupagem.optGimbal")}>{t("app.studio.forms.decupagem.optGimbal")}</option>
              <option value={t("app.studio.forms.decupagem.optDrone")}>{t("app.studio.forms.decupagem.optDrone")}</option>
              <option value={t("app.studio.forms.decupagem.optMixed")}>{t("app.studio.forms.decupagem.optMixed")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.decupagem.aestheticRef")}
            </label>
            <input
              type="text"
              value={data.referencia || ""}
              onChange={(e) => onChange("referencia", e.target.value)}
              placeholder="Ex: Cidade de Deus, Drive, Euphoria"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.decupagem.keyCrew")}
            </label>
            <input
              type="text"
              value={data.equipe || ""}
              onChange={(e) => onChange("equipe", e.target.value)}
              placeholder="Ex: Diretor, DOP, Assistente de Câmera, Gaffer"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.decupagem.notesLight")}
            </label>
            <textarea
              value={data.observacoes || ""}
              onChange={(e) => onChange("observacoes", e.target.value)}
              placeholder="Luz natural, kit de LED portátil, locação externa sem energia..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
