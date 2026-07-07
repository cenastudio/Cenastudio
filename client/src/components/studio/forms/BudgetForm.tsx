import { useLanguage } from "@/contexts/LanguageContext";
import SessionGuide from "./SessionGuide";

interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function BudgetForm({ data, onChange }: FormProps) {
  const { t } = useLanguage();

  const completed = [
    data.tipo,
    data.dias || data.locacoes,
    data.equipe || data.camera || data.edicao,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <SessionGuide
        label={t("app.studio.forms.budget.sessionLabel")}
        title={t("app.studio.forms.budget.sessionTitle")}
        steps={[
          t("app.studio.forms.budget.step1"),
          t("app.studio.forms.budget.step2"),
          t("app.studio.forms.budget.step3"),
        ]}
        output={t("app.studio.forms.budget.sessionOutput")}
        completed={completed}
      />

      {/* Seção 1: Escopo do Projeto */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.budget.sectionScope")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.budget.productionType")}
            </label>
            <select
              value={data.tipo || t("app.studio.forms.budget.optInstitutional")}
              onChange={(e) => onChange("tipo", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.budget.optInstitutional")}>{t("app.studio.forms.budget.optInstitutional")}</option>
              <option value={t("app.studio.forms.budget.optAdvertising")}>{t("app.studio.forms.budget.optAdvertising")}</option>
              <option value={t("app.studio.forms.budget.optShortFilm")}>{t("app.studio.forms.budget.optShortFilm")}</option>
              <option value={t("app.studio.forms.budget.optDocumentary")}>{t("app.studio.forms.budget.optDocumentary")}</option>
              <option value={t("app.studio.forms.budget.optSocial")}>{t("app.studio.forms.budget.optSocial")}</option>
              <option value={t("app.studio.forms.budget.optEvent")}>{t("app.studio.forms.budget.optEvent")}</option>
              <option value={t("app.studio.forms.budget.optMusicVideo")}>{t("app.studio.forms.budget.optMusicVideo")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.budget.shootDays")}
              </label>
              <input
                type="number"
                value={data.dias || "2"}
                onChange={(e) => onChange("dias", e.target.value)}
                placeholder="2"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.budget.numLocations")}
              </label>
              <input
                type="number"
                value={data.locacoes || "2"}
                onChange={(e) => onChange("locacoes", e.target.value)}
                placeholder="2"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Recursos */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.budget.sectionResources")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.budget.crewSize")}
            </label>
            <select
              value={data.equipe || t("app.studio.forms.budget.optCrewMedium")}
              onChange={(e) => onChange("equipe", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.budget.optCrewSmall")}>{t("app.studio.forms.budget.optCrewSmall")}</option>
              <option value={t("app.studio.forms.budget.optCrewMedium")}>{t("app.studio.forms.budget.optCrewMedium")}</option>
              <option value={t("app.studio.forms.budget.optCrewLarge")}>{t("app.studio.forms.budget.optCrewLarge")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.budget.cast")}
            </label>
            <select
              value={data.atores || t("app.studio.forms.budget.optCastNone")}
              onChange={(e) => onChange("atores", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.budget.optCastNone")}>{t("app.studio.forms.budget.optCastNone")}</option>
              <option value={t("app.studio.forms.budget.optCastInternal")}>{t("app.studio.forms.budget.optCastInternal")}</option>
              <option value={t("app.studio.forms.budget.optCast2")}>{t("app.studio.forms.budget.optCast2")}</option>
              <option value={t("app.studio.forms.budget.optCast4")}>{t("app.studio.forms.budget.optCast4")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção 3: Equipamento */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.budget.sectionEquipment")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.budget.cameras")}
            </label>
            <select
              value={data.camera || t("app.studio.forms.budget.optCameraOwn")}
              onChange={(e) => onChange("camera", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.budget.optCameraOwn")}>{t("app.studio.forms.budget.optCameraOwn")}</option>
              <option value={t("app.studio.forms.budget.optCameraBasic")}>{t("app.studio.forms.budget.optCameraBasic")}</option>
              <option value={t("app.studio.forms.budget.optCameraIntermediate")}>{t("app.studio.forms.budget.optCameraIntermediate")}</option>
              <option value={t("app.studio.forms.budget.optCameraHighEnd")}>{t("app.studio.forms.budget.optCameraHighEnd")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.budget.drone")}
            </label>
            <select
              value={data.drone || t("app.studio.forms.budget.optDroneNo")}
              onChange={(e) => onChange("drone", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.budget.optDroneNo")}>{t("app.studio.forms.budget.optDroneNo")}</option>
              <option value={t("app.studio.forms.budget.optDroneOwn")}>{t("app.studio.forms.budget.optDroneOwn")}</option>
              <option value={t("app.studio.forms.budget.optDroneRental")}>{t("app.studio.forms.budget.optDroneRental")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.budget.lighting")}
            </label>
            <select
              value={data.luz || t("app.studio.forms.budget.optLightNatural")}
              onChange={(e) => onChange("luz", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.budget.optLightNatural")}>{t("app.studio.forms.budget.optLightNatural")}</option>
              <option value={t("app.studio.forms.budget.optLightBasic")}>{t("app.studio.forms.budget.optLightBasic")}</option>
              <option value={t("app.studio.forms.budget.optLightPro")}>{t("app.studio.forms.budget.optLightPro")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção 4: Pós-produção */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.budget.sectionPost")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.budget.editing")}
            </label>
            <select
              value={data.edicao || t("app.studio.forms.budget.optEditBasic")}
              onChange={(e) => onChange("edicao", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.budget.optEditBasic")}>{t("app.studio.forms.budget.optEditBasic")}</option>
              <option value={t("app.studio.forms.budget.optEditPro")}>{t("app.studio.forms.budget.optEditPro")}</option>
              <option value={t("app.studio.forms.budget.optEditPremium")}>{t("app.studio.forms.budget.optEditPremium")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.budget.soundtrack")}
            </label>
            <select
              value={data.trilha || t("app.studio.forms.budget.optMusicFree")}
              onChange={(e) => onChange("trilha", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.budget.optMusicFree")}>{t("app.studio.forms.budget.optMusicFree")}</option>
              <option value={t("app.studio.forms.budget.optMusicPremium")}>{t("app.studio.forms.budget.optMusicPremium")}</option>
              <option value={t("app.studio.forms.budget.optMusicOriginal")}>{t("app.studio.forms.budget.optMusicOriginal")}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
