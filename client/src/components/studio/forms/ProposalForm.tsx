interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function ProposalForm({ data, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      {/* Seção 1: Identidade do Proponente */}
      <div>
        <p className="font-frame-mono text-[0.54rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Sua Identidade
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.53rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Produtora / Freelancer
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
            <label className="block font-frame-mono text-[0.53rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Seu Nome Completo
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
            <label className="block font-frame-mono text-[0.53rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Seus Diferenciais Profissionais
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
        <p className="font-frame-mono text-[0.54rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Detalhes da Proposta
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.53rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Nome do Cliente
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
            <label className="block font-frame-mono text-[0.53rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Escopo Detalhado do Projeto
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
              <label className="block font-frame-mono text-[0.53rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Valor Total (BRL)
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
              <label className="block font-frame-mono text-[0.53rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
                Prazo de Entrega
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
            <label className="block font-frame-mono text-[0.53rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Condição de Pagamento
            </label>
            <select
              value={data.pagamento || "50% entrada + 50% entrega"}
              onChange={(e) => onChange("pagamento", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="50% entrada + 50% entrega">50% entrada + 50% entrega</option>
              <option value="30% entrada + 70% entrega">30% entrada + 70% entrega</option>
              <option value="100% faturamento antes do início">100% faturamento antes do início</option>
              <option value="3x mensais iguais">3x mensais iguais</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.53rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Revisões Inclusas no Valor
            </label>
            <select
              value={data.revisoes || "2 rodadas de revisão"}
              onChange={(e) => onChange("revisoes", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="2 rodadas de revisão">2 rodadas de revisão</option>
              <option value="3 rodadas de revisão">3 rodadas de revisão</option>
              <option value="1 rodada — alterações extras cobradas">1 rodada — alterações extras cobradas</option>
            </select>
          </div>

          <div>
            <label className="block font-frame-mono text-[0.53rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Tom de Comunicação
            </label>
            <select
              value={data.tom || "Profissional e formal"}
              onChange={(e) => onChange("tom", e.target.value)}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition cursor-pointer"
            >
              <option value="Profissional e formal">Profissional e formal</option>
              <option value="Próximo e descontraído">Próximo e descontraído</option>
              <option value="Criativo e diferenciado">Criativo e diferenciado</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
