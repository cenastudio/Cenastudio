import SessionGuide from "./SessionGuide";

interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function ContractForm({ data, onChange }: FormProps) {
  const completed = [
    data.tipo,
    data.contratante && data.contratado,
    data.objeto && (data.valor || data.prazo),
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <SessionGuide
        label="Sessão contrato"
        title="Organize partes, objeto e termos antes do rascunho."
        steps={["Modelo jurídico", "Partes e documentos", "Objeto, valor e vigência"]}
        output="Saída esperada: minuta de referência para revisão jurídica antes de assinatura."
        completed={completed}
      />

      {/* Seção 1: Modelo Contratual */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Tipo de Instrumento
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Modelo de Contrato
            </label>
            <select
              value={data.tipo || "Prestação de Serviços Audiovisuais"}
              onChange={(e) => onChange("tipo", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Prestação de Serviços Audiovisuais">Prestação de Serviços Audiovisuais</option>
              <option value="Cessão de Direitos de Imagem">Cessão de Direitos de Imagem</option>
              <option value="Cessão de Uso de Trilha Sonora">Cessão de Uso de Trilha Sonora</option>
              <option value="Contrato de Locação de Espaço">Contrato de Locação de Espaço</option>
              <option value="NDA — Termo de Confidencialidade">NDA — Termo de Confidencialidade</option>
              <option value="Contrato de Freelancer / Prestador de Serviço">Contrato de Freelancer / Prestador de Serviço</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção 2: Partes Contratantes */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Partes Envolvidas
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Contratante (Cliente)
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
                CPF / CNPJ Contratante
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
                Contratado (Você)
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
                CPF / CNPJ Contratado
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
          // Objeto & Termos
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Objeto (Descrição do Serviço)
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
                Valor Total (BRL)
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
                Prazo de Vigência/Entrega
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
              Foro para Resolução de Conflitos
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
