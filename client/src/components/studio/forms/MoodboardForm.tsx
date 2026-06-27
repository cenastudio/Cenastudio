interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function MoodboardForm({ data, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      {/* Seção 1: Estética */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Conceito & Estética
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Tom Geral / Estilo Visual
            </label>
            <select
              value={data.tom || "Moderno e tecnológico"}
              onChange={(e) => onChange("tom", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Moderno e tecnológico">Moderno e tecnológico</option>
              <option value="Quente e humano">Quente e humano</option>
              <option value="Frio e minimalista">Frio e minimalista</option>
              <option value="Vintage / analógico">Vintage / analógico</option>
              <option value="Documental e real">Documental e real</option>
              <option value="Onírico e poético">Onírico e poético</option>
              <option value="Urbano e dinâmico">Urbano e dinâmico</option>
              <option value="Natural e orgânico">Natural e orgânico</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Referências Visuais (Diretores/Filmes)
            </label>
            <textarea
              value={data.referencias || ""}
              onChange={(e) => onChange("referencias", e.target.value)}
              placeholder="Ex: Wong Kar-Wai, Terrence Malick, Ari Aster, Roger Deakins..."
              rows={2}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Paleta de Cores Recomendada
            </label>
            <input
              type="text"
              value={data.cores || ""}
              onChange={(e) => onChange("cores", e.target.value)}
              placeholder="Ex: Tons terrosos, azul frio, preto e laranja, pastel neon..."
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
            />
          </div>
        </div>
      </div>

      {/* Seção 2: Aspectos Técnicos */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Aspectos Técnicos do Look
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Proporção de Tela (Aspect Ratio)
            </label>
            <select
              value={data.aspecto || "16:9 — Cinema/TV"}
              onChange={(e) => onChange("aspecto", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="16:9 — Cinema/TV">16:9 — Cinema/TV</option>
              <option value="2.39:1 — Cinemascope">2.39:1 — Cinemascope</option>
              <option value="1.85:1 — Flat">1.85:1 — Flat</option>
              <option value="4:3 — Vintage">4:3 — Vintage</option>
              <option value="9:16 — Vertical (Reels/TikTok)">9:16 — Vertical (Reels/TikTok)</option>
              <option value="1:1 — Quadrado">1:1 — Quadrado</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Look de Colorização / Color Grading
            </label>
            <select
              value={data.colorizacao || "Cinematográfico — alto contraste"}
              onChange={(e) => onChange("colorizacao", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Natural / realista">Natural / realista</option>
              <option value="Cinematográfico — alto contraste">Cinematográfico — alto contraste</option>
              <option value="Dessaturado / moody">Dessaturado / moody</option>
              <option value="Quente e âmbar">Quente e âmbar</option>
              <option value="Frio e azulado">Frio e azulado</option>
              <option value="Preto e branco">Preto e branco</option>
              <option value="Teal and orange">Teal and orange</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Estilo de Iluminação
            </label>
            <select
              value={data.luz || "Natural — golden hour"}
              onChange={(e) => onChange("luz", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Natural — golden hour">Natural — golden hour</option>
              <option value="Natural — dia difuso / nublado">Natural — dia difuso / nublado</option>
              <option value="Artificial — chiaroscuro / alto contraste">Artificial — chiaroscuro / alto contraste</option>
              <option value="Artificial — neon / urbana">Artificial — neon / urbana</option>
              <option value="Mista (natural e refletores)">Mista (natural e refletores)</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Descrição Sensorial do Projeto
            </label>
            <textarea
              value={data.descricao || ""}
              onChange={(e) => onChange("descricao", e.target.value)}
              placeholder="Descreva o sentimento, atmosfera e o ambiente visual do projeto..."
              rows={3}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
