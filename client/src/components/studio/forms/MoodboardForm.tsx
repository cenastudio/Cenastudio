import { useLanguage } from "@/contexts/LanguageContext";

interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function MoodboardForm({ data, onChange }: FormProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* Seção 1: Estética */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.moodboard.sectionConcept")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.moodboard.visualTone")}
            </label>
            <select
              value={data.tom || t("app.studio.forms.moodboard.optToneModern")}
              onChange={(e) => onChange("tom", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.moodboard.optToneModern")}>{t("app.studio.forms.moodboard.optToneModern")}</option>
              <option value={t("app.studio.forms.moodboard.optToneWarm")}>{t("app.studio.forms.moodboard.optToneWarm")}</option>
              <option value={t("app.studio.forms.moodboard.optToneCold")}>{t("app.studio.forms.moodboard.optToneCold")}</option>
              <option value={t("app.studio.forms.moodboard.optToneVintage")}>{t("app.studio.forms.moodboard.optToneVintage")}</option>
              <option value={t("app.studio.forms.moodboard.optToneDocumentary")}>{t("app.studio.forms.moodboard.optToneDocumentary")}</option>
              <option value={t("app.studio.forms.moodboard.optToneDreamlike")}>{t("app.studio.forms.moodboard.optToneDreamlike")}</option>
              <option value={t("app.studio.forms.moodboard.optToneUrban")}>{t("app.studio.forms.moodboard.optToneUrban")}</option>
              <option value={t("app.studio.forms.moodboard.optToneNatural")}>{t("app.studio.forms.moodboard.optToneNatural")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.moodboard.visualRefs")}
            </label>
            <textarea
              value={data.referencias || ""}
              onChange={(e) => onChange("referencias", e.target.value)}
              placeholder="Ex: Wong Kar-Wai, Terrence Malick, Ari Aster, Roger Deakins..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.moodboard.colorPalette")}
            </label>
            <input
              type="text"
              value={data.cores || ""}
              onChange={(e) => onChange("cores", e.target.value)}
              placeholder="Ex: Tons terrosos, azul frio, preto e laranja, pastel neon..."
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>
        </div>
      </div>

      {/* Seção 2: Aspectos Técnicos */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.moodboard.sectionTechnical")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.moodboard.aspectRatio")}
            </label>
            <select
              value={data.aspecto || t("app.studio.forms.moodboard.optAspect169")}
              onChange={(e) => onChange("aspecto", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.moodboard.optAspect169")}>{t("app.studio.forms.moodboard.optAspect169")}</option>
              <option value={t("app.studio.forms.moodboard.optAspect239")}>{t("app.studio.forms.moodboard.optAspect239")}</option>
              <option value={t("app.studio.forms.moodboard.optAspect185")}>{t("app.studio.forms.moodboard.optAspect185")}</option>
              <option value={t("app.studio.forms.moodboard.optAspect43")}>{t("app.studio.forms.moodboard.optAspect43")}</option>
              <option value={t("app.studio.forms.moodboard.optAspect916")}>{t("app.studio.forms.moodboard.optAspect916")}</option>
              <option value={t("app.studio.forms.moodboard.optAspect11")}>{t("app.studio.forms.moodboard.optAspect11")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.moodboard.colorGrading")}
            </label>
            <select
              value={data.colorizacao || t("app.studio.forms.moodboard.optGradingCinematic")}
              onChange={(e) => onChange("colorizacao", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.moodboard.optGradingNatural")}>{t("app.studio.forms.moodboard.optGradingNatural")}</option>
              <option value={t("app.studio.forms.moodboard.optGradingCinematic")}>{t("app.studio.forms.moodboard.optGradingCinematic")}</option>
              <option value={t("app.studio.forms.moodboard.optGradingDesaturated")}>{t("app.studio.forms.moodboard.optGradingDesaturated")}</option>
              <option value={t("app.studio.forms.moodboard.optGradingWarm")}>{t("app.studio.forms.moodboard.optGradingWarm")}</option>
              <option value={t("app.studio.forms.moodboard.optGradingCold")}>{t("app.studio.forms.moodboard.optGradingCold")}</option>
              <option value={t("app.studio.forms.moodboard.optGradingBW")}>{t("app.studio.forms.moodboard.optGradingBW")}</option>
              <option value={t("app.studio.forms.moodboard.optGradingTealOrange")}>{t("app.studio.forms.moodboard.optGradingTealOrange")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.moodboard.lightingStyle")}
            </label>
            <select
              value={data.luz || t("app.studio.forms.moodboard.optLightGolden")}
              onChange={(e) => onChange("luz", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.moodboard.optLightGolden")}>{t("app.studio.forms.moodboard.optLightGolden")}</option>
              <option value={t("app.studio.forms.moodboard.optLightDiffuse")}>{t("app.studio.forms.moodboard.optLightDiffuse")}</option>
              <option value={t("app.studio.forms.moodboard.optLightChiaroscuro")}>{t("app.studio.forms.moodboard.optLightChiaroscuro")}</option>
              <option value={t("app.studio.forms.moodboard.optLightNeon")}>{t("app.studio.forms.moodboard.optLightNeon")}</option>
              <option value={t("app.studio.forms.moodboard.optLightMixed")}>{t("app.studio.forms.moodboard.optLightMixed")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.moodboard.sensoryDescription")}
            </label>
            <textarea
              value={data.descricao || ""}
              onChange={(e) => onChange("descricao", e.target.value)}
              placeholder="Descreva o sentimento, atmosfera e o ambiente visual do projeto..."
              rows={3}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
