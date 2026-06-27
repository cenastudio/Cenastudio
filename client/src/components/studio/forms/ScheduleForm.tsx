interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function ScheduleForm({ data, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      {/* Seção 1: Projeto */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Cronograma do Projeto
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Tipo de Produção
              </label>
              <select
                value={data.tipo || "Vídeo Institucional"}
                onChange={(e) => onChange("tipo", e.target.value)}
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
              >
                <option value="Vídeo Institucional">Vídeo Institucional</option>
                <option value="Curta-metragem">Curta-metragem</option>
                <option value="Documentário">Documentário</option>
                <option value="Vídeo Publicitário">Vídeo Publicitário</option>
                <option value="Webserie">Websérie</option>
                <option value="Videoclipe">Videoclipe</option>
              </select>
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Dias de Filmagem
              </label>
              <input
                type="number"
                value={data.dias || "3"}
                onChange={(e) => onChange("dias", e.target.value)}
                placeholder="3"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Equipe e Entregas */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Equipe & Entregáveis
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Equipe Envolvida
            </label>
            <textarea
              value={data.equipe || ""}
              onChange={(e) => onChange("equipe", e.target.value)}
              placeholder="Ex: Diretor, Produtor, DOP, Editor, Gaffer, Técnico de Áudio..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Entregáveis Finais do Projeto
            </label>
            <textarea
              value={data.entregaveis || ""}
              onChange={(e) => onChange("entregaveis", e.target.value)}
              placeholder="Ex: 1 vídeo principal de 2min, 3 cortes verticais de 30s..."
              rows={3}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
