import { useLanguage } from "@/contexts/LanguageContext";
import SessionGuide from "./SessionGuide";

interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function BriefingForm({ data, onChange }: FormProps) {
  const { t } = useLanguage();

  const completed = [
    data.cliente,
    data.objetivo,
    data.publico || data.veiculacao,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <SessionGuide
        label={t("app.studio.forms.briefing.sessionLabel")}
        title={t("app.studio.forms.briefing.sessionTitle")}
        steps={[
          t("app.studio.forms.briefing.step1"),
          t("app.studio.forms.briefing.step2"),
          t("app.studio.forms.briefing.step3"),
        ]}
        output={t("app.studio.forms.briefing.sessionOutput")}
        completed={completed}
      />

      {/* Seção 1: Cliente */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.briefing.sectionClient")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.briefing.clientName")}
            </label>
            <input
              type="text"
              value={data.cliente || ""}
              onChange={(e) => onChange("cliente", e.target.value)}
              placeholder="Ex: Startup TechXYZ"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.briefing.segment")}
            </label>
            <input
              type="text"
              value={data.segmento || ""}
              onChange={(e) => onChange("segmento", e.target.value)}
              placeholder="Ex: Tecnologia, Saúde, Educação, Finanças"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.briefing.contentType")}
            </label>
            <select
              value={data.tipo || t("app.studio.forms.briefing.optInstitutional")}
              onChange={(e) => onChange("tipo", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.briefing.optInstitutional")}>{t("app.studio.forms.briefing.optInstitutional")}</option>
              <option value={t("app.studio.forms.briefing.optProduct")}>{t("app.studio.forms.briefing.optProduct")}</option>
              <option value={t("app.studio.forms.briefing.optTestimonial")}>{t("app.studio.forms.briefing.optTestimonial")}</option>
              <option value={t("app.studio.forms.briefing.optTraining")}>{t("app.studio.forms.briefing.optTraining")}</option>
              <option value={t("app.studio.forms.briefing.optSocial")}>{t("app.studio.forms.briefing.optSocial")}</option>
              <option value={t("app.studio.forms.briefing.optEvent")}>{t("app.studio.forms.briefing.optEvent")}</option>
              <option value={t("app.studio.forms.briefing.optAdvertising")}>{t("app.studio.forms.briefing.optAdvertising")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção 2: Contexto */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.briefing.sectionContext")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.briefing.mainObjective")}
            </label>
            <textarea
              value={data.objetivo || ""}
              onChange={(e) => onChange("objetivo", e.target.value)}
              placeholder="O que o cliente deseja comunicar com este vídeo? Qual o problema a resolver?"
              rows={3.5}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.briefing.targetAudience")}
            </label>
            <input
              type="text"
              value={data.publico || ""}
              onChange={(e) => onChange("publico", e.target.value)}
              placeholder="Ex: Jovens profissionais de 20-30 anos, B2B..."
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.briefing.distributionChannel")}
            </label>
            <input
              type="text"
              value={data.veiculacao || ""}
              onChange={(e) => onChange("veiculacao", e.target.value)}
              placeholder="Ex: YouTube, Instagram, TV Corporativa, Site Institucional"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.briefing.desiredDuration")}
              </label>
              <input
                type="text"
                value={data.duracao || ""}
                onChange={(e) => onChange("duracao", e.target.value)}
                placeholder="Ex: 2-3 min"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.briefing.deadline")}
              </label>
              <input
                type="text"
                value={data.prazo || ""}
                onChange={(e) => onChange("prazo", e.target.value)}
                placeholder="Ex: 30 dias"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.briefing.videoReferences")}
            </label>
            <input
              type="text"
              value={data.referencias || ""}
              onChange={(e) => onChange("referencias", e.target.value)}
              placeholder="Ex: Estilo documentário da Apple, cores frias..."
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.briefing.restrictions")}
            </label>
            <textarea
              value={data.restricoes || ""}
              onChange={(e) => onChange("restricoes", e.target.value)}
              placeholder="Linguagem agressiva, piadas internas, cenas externas de dia..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
