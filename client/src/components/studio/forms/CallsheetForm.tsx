import { useLanguage } from "@/contexts/LanguageContext";

interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function CallsheetForm({ data, onChange }: FormProps) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      {/* Seção 1: Produção */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.callsheet.sectionProduction")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.callsheet.productionName")}
            </label>
            <input
              type="text"
              value={data.producao || ""}
              onChange={(e) => onChange("producao", e.target.value)}
              placeholder="Ex: Vídeo Institucional XYZ"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.callsheet.filmingDate")}
              </label>
              <input
                type="date"
                value={data.data || ""}
                onChange={(e) => onChange("data", e.target.value)}
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.callsheet.cityState")}
              </label>
              <input
                type="text"
                value={data.cidade || ""}
                onChange={(e) => onChange("cidade", e.target.value)}
                placeholder="Ex: São Paulo, SP"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.callsheet.locationAddress")}
            </label>
            <input
              type="text"
              value={data.endereco || ""}
              onChange={(e) => onChange("endereco", e.target.value)}
              placeholder="Ex: Rua das Flores, 123 — Vila Madalena"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.callsheet.callTime")}
              </label>
              <input
                type="time"
                value={data.calltime || "07:00"}
                onChange={(e) => onChange("calltime", e.target.value)}
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.callsheet.expectedWrap")}
              </label>
              <input
                type="time"
                value={data.wrap || "19:00"}
                onChange={(e) => onChange("wrap", e.target.value)}
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Equipe */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.callsheet.sectionCrew")}
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.callsheet.director")}
              </label>
              <input
                type="text"
                value={data.diretor || ""}
                onChange={(e) => onChange("diretor", e.target.value)}
                placeholder="Nome — Celular"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.callsheet.executiveProducer")}
              </label>
              <input
                type="text"
                value={data.produtor || ""}
                onChange={(e) => onChange("produtor", e.target.value)}
                placeholder="Nome — Celular"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.callsheet.dop")}
              </label>
              <input
                type="text"
                value={data.dop || ""}
                onChange={(e) => onChange("dop", e.target.value)}
                placeholder="Nome — Celular"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                {t("app.studio.forms.callsheet.sound")}
              </label>
              <input
                type="text"
                value={data.som || ""}
                onChange={(e) => onChange("som", e.target.value)}
                placeholder="Nome — Celular"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.callsheet.otherCrew")}
            </label>
            <textarea
              value={data.equipe || ""}
              onChange={(e) => onChange("equipe", e.target.value)}
              placeholder="Função — Nome — Celular (um por linha)..."
              rows={2.5}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
        </div>
      </div>

      {/* Seção 3: Logística */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          {t("app.studio.forms.callsheet.sectionLogistics")}
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.callsheet.mainEquipment")}
            </label>
            <textarea
              value={data.equipamentos || ""}
              onChange={(e) => onChange("equipamentos", e.target.value)}
              placeholder="Sony FX3, Gimbal DJI, Kit de LEDs, Microfone Boom..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              {t("app.studio.forms.callsheet.instructions")}
            </label>
            <textarea
              value={data.observacoes || ""}
              onChange={(e) => onChange("observacoes", e.target.value)}
              placeholder="Estacionamento livre, alimentação no local às 12h, trazer casaco..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
