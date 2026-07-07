import { useLanguage } from "@/contexts/LanguageContext";
import SessionGuide from "./SessionGuide";

interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function ProposalForm({ data, onChange }: FormProps) {
  const { t } = useLanguage();

  const completed = [
    data.cliente,
    data.escopo,
    data.valor || data.prazo,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <SessionGuide
        label={t("app.studio.forms.proposal.sessionLabel")}
        title={t("app.studio.forms.proposal.sessionTitle")}
        steps={[
          t("app.studio.forms.proposal.step1"),
          t("app.studio.forms.proposal.step2"),
          t("app.studio.forms.proposal.step3"),
        ]}
        output={t("app.studio.forms.proposal.sessionOutput")}
        completed={completed}
      />

      {/* Seção 1: Identidade do Proponente */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.proposal.sectionIdentity")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.proposal.company")}
            </label>
            <input
              type="text"
              value={data.empresa || ""}
              onChange={(e) => onChange("empresa", e.target.value)}
              placeholder="Ex: Cena Filmes"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.proposal.fullName")}
            </label>
            <input
              type="text"
              value={data.nome || ""}
              onChange={(e) => onChange("nome", e.target.value)}
              placeholder="Ex: João Silva"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.proposal.credentials")}
            </label>
            <textarea
              value={data.diferenciais || ""}
              onChange={(e) => onChange("diferenciais", e.target.value)}
              placeholder="Ex: 5 anos de experiência, prêmios locais, portfólio robusto..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
        </div>
      </div>

      {/* Seção 2: O Negócio */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.proposal.sectionDetails")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.proposal.clientName")}
            </label>
            <input
              type="text"
              value={data.cliente || ""}
              onChange={(e) => onChange("cliente", e.target.value)}
              placeholder="Ex: Empresa ABC"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.proposal.scope")}
            </label>
            <textarea
              value={data.escopo || ""}
              onChange={(e) => onChange("escopo", e.target.value)}
              placeholder="Roteirização, 2 diárias de gravação em estúdio com equipamentos de ponta, edição finalizada com trilha sonora..."
              rows={3}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.proposal.totalValue")}
              </label>
              <input
                type="text"
                value={data.valor || ""}
                onChange={(e) => onChange("valor", e.target.value)}
                placeholder="Ex: R$ 8.000,00"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.proposal.deadline")}
              </label>
              <input
                type="text"
                value={data.prazo || ""}
                onChange={(e) => onChange("prazo", e.target.value)}
                placeholder="Ex: 30 dias úteis"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.proposal.paymentTerms")}
            </label>
            <select
              value={data.pagamento || t("app.studio.forms.proposal.optPayment5050")}
              onChange={(e) => onChange("pagamento", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.proposal.optPayment5050")}>{t("app.studio.forms.proposal.optPayment5050")}</option>
              <option value={t("app.studio.forms.proposal.optPayment3070")}>{t("app.studio.forms.proposal.optPayment3070")}</option>
              <option value={t("app.studio.forms.proposal.optPayment100")}>{t("app.studio.forms.proposal.optPayment100")}</option>
              <option value={t("app.studio.forms.proposal.optPayment3x")}>{t("app.studio.forms.proposal.optPayment3x")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.proposal.revisions")}
            </label>
            <select
              value={data.revisoes || t("app.studio.forms.proposal.optRevisions2")}
              onChange={(e) => onChange("revisoes", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.proposal.optRevisions2")}>{t("app.studio.forms.proposal.optRevisions2")}</option>
              <option value={t("app.studio.forms.proposal.optRevisions3")}>{t("app.studio.forms.proposal.optRevisions3")}</option>
              <option value={t("app.studio.forms.proposal.optRevisions1")}>{t("app.studio.forms.proposal.optRevisions1")}</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.proposal.tone")}
            </label>
            <select
              value={data.tom || t("app.studio.forms.proposal.optToneFormal")}
              onChange={(e) => onChange("tom", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value={t("app.studio.forms.proposal.optToneFormal")}>{t("app.studio.forms.proposal.optToneFormal")}</option>
              <option value={t("app.studio.forms.proposal.optToneCasual")}>{t("app.studio.forms.proposal.optToneCasual")}</option>
              <option value={t("app.studio.forms.proposal.optToneCreative")}>{t("app.studio.forms.proposal.optToneCreative")}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
