interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function ScriptForm({ data, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      {/* Seção 1: Projeto */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Projeto
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Título do Roteiro
            </label>
            <input
              type="text"
              value={data.titulo || ""}
              onChange={(e) => onChange("titulo", e.target.value)}
              placeholder="Ex: Deriva Urbana"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Formato
            </label>
            <select
              value={data.formato || "Curta-metragem (ficção)"}
              onChange={(e) => onChange("formato", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Curta-metragem (ficção)">Curta-metragem (ficção)</option>
              <option value="Vídeo Institucional">Vídeo Institucional</option>
              <option value="Vídeo Publicitário / TVC">Vídeo Publicitário / TVC</option>
              <option value="Documentário">Documentário</option>
              <option value="Vídeo para Redes Sociais">Vídeo para Redes Sociais</option>
              <option value="Videoclipe">Videoclipe</option>
              <option value="Websérie / Episódio">Websérie / Episódio</option>
              <option value="Longa-metragem">Longa-metragem</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Duração
              </label>
              <input
                type="text"
                value={data.duracao || ""}
                onChange={(e) => onChange("duracao", e.target.value)}
                placeholder="Ex: 5 min"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Gênero / Tom
              </label>
              <input
                type="text"
                value={data.genero || ""}
                onChange={(e) => onChange("genero", e.target.value)}
                placeholder="Ex: Drama, humor..."
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: História */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // História & Conceito
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Sinopse / Ideia Base
            </label>
            <textarea
              value={data.sinopse || ""}
              onChange={(e) => onChange("sinopse", e.target.value)}
              placeholder="Descreva a história ou o conceito..."
              rows={3}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Personagens
            </label>
            <input
              type="text"
              value={data.personagens || ""}
              onChange={(e) => onChange("personagens", e.target.value)}
              placeholder="Ex: João (30 anos), Maria (28 anos)"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Locações
            </label>
            <input
              type="text"
              value={data.locacoes || ""}
              onChange={(e) => onChange("locacoes", e.target.value)}
              placeholder="Ex: Metrô SP, apartamento, rua"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Referências Estéticas
            </label>
            <input
              type="text"
              value={data.referencias || ""}
              onChange={(e) => onChange("referencias", e.target.value)}
              placeholder="Ex: Kiarostami, Nolan, Cidade de Deus"
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Observações Especiais
            </label>
            <textarea
              value={data.observacoes || ""}
              onChange={(e) => onChange("observacoes", e.target.value)}
              placeholder="Restrições, mensagem central, chamadas de ação..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
