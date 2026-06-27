interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function BriefingForm({ data, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      {/* Seção 1: Cliente */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Cliente & Identidade
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Nome do Cliente / Empresa
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
              Segmento de Atuação
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
              Tipo de Conteúdo/Vídeo
            </label>
            <select
              value={data.tipo || "Vídeo Institucional"}
              onChange={(e) => onChange("tipo", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Vídeo Institucional">Vídeo Institucional</option>
              <option value="Vídeo de Produto">Vídeo de Produto</option>
              <option value="Depoimento / Testimonial">Depoimento / Testimonial</option>
              <option value="Treinamento Interno">Treinamento Interno</option>
              <option value="Redes Sociais">Redes Sociais</option>
              <option value="Evento Corporativo">Evento Corporativo</option>
              <option value="Vídeo Publicitário">Vídeo Publicitário</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção 2: Contexto */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Contexto & Metas
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Objetivo Principal
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
              Público-Alvo
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
              Canal de Veiculação principal
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
                Duração Desejada
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
                Prazo de Entrega
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
              Referências de Vídeos
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
              O que NÃO deve aparecer/conter (Restrições)
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
