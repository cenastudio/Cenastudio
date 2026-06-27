interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function DeliveryForm({ data, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      {/* Seção 1: Informações Gerais */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Identificação do Projeto
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Nome do Projeto
            </label>
            <input
              type="text"
              value={data.nome || ""}
              onChange={(e) => onChange("nome", e.target.value)}
              placeholder="Ex: Vídeo Institucional ABC"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Cliente
            </label>
            <input
              type="text"
              value={data.cliente || ""}
              onChange={(e) => onChange("cliente", e.target.value)}
              placeholder="Ex: Empresa de Alimentos XYZ"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Data de Início
              </label>
              <input
                type="date"
                value={data.inicio || ""}
                onChange={(e) => onChange("inicio", e.target.value)}
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Data de Entrega
              </label>
              <input
                type="date"
                value={data.entrega || ""}
                onChange={(e) => onChange("entrega", e.target.value)}
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Entregáveis e Especificações */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Entregáveis & Specs
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Lista de Arquivos Entregues
            </label>
            <textarea
              value={data.arquivos || ""}
              onChange={(e) => onChange("arquivos", e.target.value)}
              placeholder="Ex:&#10;- Video_Principal_4K.mp4 (2min30s)&#10;- Corte_Vertical_Reels.mp4 (30s)&#10;- Fotos_MakingOf_HighRes.zip"
              rows={3}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Especificações Técnicas dos Arquivos
            </label>
            <textarea
              value={data.especificacoes || ""}
              onChange={(e) => onChange("especificacoes", e.target.value)}
              placeholder="Ex: Resolução 4K 3840x2160, frame rate 23.98fps, codec H.264, perfil de cor sRGB..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Notas Finais / Instruções para o Cliente
            </label>
            <textarea
              value={data.notas || ""}
              onChange={(e) => onChange("notas", e.target.value)}
              placeholder="Ex: Link para download válido por 30 dias. Créditos de música royalty-free anexados..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
