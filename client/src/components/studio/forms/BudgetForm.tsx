interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function BudgetForm({ data, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      {/* Seção 1: Escopo do Projeto */}
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Escopo do Projeto
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Tipo de Produção
            </label>
            <select
              value={data.tipo || "Vídeo Institucional (1-3 min)"}
              onChange={(e) => onChange("tipo", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Vídeo Institucional (1-3 min)">Vídeo Institucional (1-3 min)</option>
              <option value="Vídeo Publicitário / TVC 30s">Vídeo Publicitário / TVC 30s</option>
              <option value="Curta-metragem">Curta-metragem</option>
              <option value="Documentário">Documentário</option>
              <option value="Vídeo para Redes Sociais">Vídeo para Redes Sociais</option>
              <option value="Evento Corporativo">Evento Corporativo</option>
              <option value="Videoclipe">Videoclipe</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Dias de Filmagem
              </label>
              <input
                type="number"
                value={data.dias || "2"}
                onChange={(e) => onChange("dias", e.target.value)}
                placeholder="2"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
            <div>
              <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Nº de Locações
              </label>
              <input
                type="number"
                value={data.locacoes || "2"}
                onChange={(e) => onChange("locacoes", e.target.value)}
                placeholder="2"
                className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2: Recursos */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Recursos & Equipe
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Tamanho da Equipe Técnica
            </label>
            <select
              value={data.equipe || "Média (5-8 pessoas)"}
              onChange={(e) => onChange("equipe", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Pequena (2-4 pessoas)">Pequena (2-4 pessoas)</option>
              <option value="Média (5-8 pessoas)">Média (5-8 pessoas)</option>
              <option value="Grande (9-15 pessoas)">Grande (9-15 pessoas)</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Elenco / Apresentadores / Atores
            </label>
            <select
              value={data.atores || "Não"}
              onChange={(e) => onChange("atores", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Não">Não</option>
              <option value="Equipe interna do cliente">Equipe interna do cliente</option>
              <option value="Atores contratados (2)">Atores contratados (2)</option>
              <option value="Atores contratados (4+)">Atores contratados (4+)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção 3: Equipamento */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Infraestrutura & Equipamento
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Câmeras & Ópticas
            </label>
            <select
              value={data.camera || "Câmera própria (sem custo)"}
              onChange={(e) => onChange("camera", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Câmera própria (sem custo)">Câmera própria (sem custo)</option>
              <option value="Aluguel básico (Sony A7, Lumix S5)">Aluguel básico (Sony A7, Lumix S5)</option>
              <option value="Aluguel cinema intermediário (FX6, C70)">Aluguel cinema intermediário (FX6, C70)</option>
              <option value="Aluguel cinema topo (ARRI, RED, FX9)">Aluguel cinema topo (ARRI, RED, FX9)</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Drone e Capturas Aéreas
            </label>
            <select
              value={data.drone || "Não"}
              onChange={(e) => onChange("drone", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Não">Não</option>
              <option value="Sim — próprio (sem custo operacional extra)">Sim — próprio (sem custo operacional extra)</option>
              <option value="Sim — aluguel + piloto credenciado">Sim — aluguel + piloto credenciado</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Kit de Iluminação
            </label>
            <select
              value={data.luz || "Luz natural (sem custo)"}
              onChange={(e) => onChange("luz", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Luz natural (sem custo)">Luz natural (sem custo)</option>
              <option value="Kit básico próprio (LEDs leves)">Kit básico próprio (LEDs leves)</option>
              <option value="Aluguel de kit profissional (Aputure, rebatedores)">Aluguel de kit profissional (Aputure, rebatedores)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Seção 4: Pós-produção */}
      <div className="pt-2 border-t border-frame-gray-2">
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Pós-Produção & Finalização
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Serviços de Edição / Montagem
            </label>
            <select
              value={data.edicao || "Básica (corte, color simples)"}
              onChange={(e) => onChange("edicao", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Básica (corte, color simples)">Básica (corte, color simples)</option>
              <option value="Profissional (color, motion, trilha)">Profissional (color, motion, trilha)</option>
              <option value="Premium (VFX, 3D, animação complexa)">Premium (VFX, 3D, animação complexa)</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Trilha Sonora & Direitos
            </label>
            <select
              value={data.trilha || "Banco royalty-free"}
              onChange={(e) => onChange("trilha", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Banco royalty-free">Banco royalty-free</option>
              <option value="Banco premium (licenciada)">Banco premium (licenciada)</option>
              <option value="Composição original / exclusiva">Composição original / exclusiva</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
