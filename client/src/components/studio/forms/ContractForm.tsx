import { useLanguage } from "@/contexts/LanguageContext";
import SessionGuide from "./SessionGuide";

interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function ContractForm({ data, onChange }: FormProps) {
  const { t } = useLanguage();

  const completed = [
    data.tipo,
    data.contratante && data.contratado,
    data.objeto && (data.valor || data.prazo),
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <SessionGuide
        label={t("app.studio.forms.contract.sessionLabel")}
        title={t("app.studio.forms.contract.sessionTitle")}
        steps={[
          t("app.studio.forms.contract.step1"),
          t("app.studio.forms.contract.step2"),
          t("app.studio.forms.contract.step3"),
        ]}
        output={t("app.studio.forms.contract.sessionOutput")}
        completed={completed}
      />

      {/* Seção 1: Modelo Contratual */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.contract.sectionType")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.contract.contractModel")}
            </label>
            <select
              value={data.tipo || t("app.studio.forms.contract.optAudiovisual")}
              onChange={(e) => onChange("tipo", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.contract.optAudiovisual")}>{t("app.studio.forms.contract.optAudiovisual")}</option>
              <option value={t("app.studio.forms.contract.optImageRights")}>{t("app.studio.forms.contract.optImageRights")}</option>
              <option value={t("app.studio.forms.contract.optSoundtrack")}>{t("app.studio.forms.contract.optSoundtrack")}</option>
              <option value={t("app.studio.forms.contract.optLocationRental")}>{t("app.studio.forms.contract.optLocationRental")}</option>
              <option value={t("app.studio.forms.contract.optNDA")}>{t("app.studio.forms.contract.optNDA")}</option>
              <option value={t("app.studio.forms.contract.optFreelancer")}>{t("app.studio.forms.contract.optFreelancer")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção 2: Partes Contratantes */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.contract.sectionParties")}
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.contract.contractingParty")}
              </label>
              <input
                type="text"
                value={data.contratante || ""}
                onChange={(e) => onChange("contratante", e.target.value)}
                placeholder="Razão Social / Nome completo"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.contract.contractingDoc")}
              </label>
              <input
                type="text"
                value={data.cpf_contratante || ""}
                onChange={(e) => onChange("cpf_contratante", e.target.value)}
                placeholder="00.000.000/0001-00"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.contract.contractor")}
              </label>
              <input
                type="text"
                value={data.contratado || ""}
                onChange={(e) => onChange("contratado", e.target.value)}
                placeholder="Seu nome / Nome da sua empresa"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.contract.contractorDoc")}
              </label>
              <input
                type="text"
                value={data.cpf_contratado || ""}
                onChange={(e) => onChange("cpf_contratado", e.target.value)}
                placeholder="00.000.000/0001-00"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 3: Objeto do Serviço */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.contract.sectionObject")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.contract.serviceObject")}
            </label>
            <textarea
              value={data.objeto || ""}
              onChange={(e) => onChange("objeto", e.target.value)}
              placeholder="Descreva o serviço a ser contratado de forma precisa..."
              rows={2.5}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.contract.totalValue")}
              </label>
              <input
                type="text"
                value={data.valor || ""}
                onChange={(e) => onChange("valor", e.target.value)}
                placeholder="Ex: R$ 5.000,00"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.contract.termDelivery")}
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
              {t("app.studio.forms.contract.jurisdiction")}
            </label>
            <input
              type="text"
              value={data.foro || ""}
              onChange={(e) => onChange("foro", e.target.value)}
              placeholder="Ex: São Paulo, SP"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
