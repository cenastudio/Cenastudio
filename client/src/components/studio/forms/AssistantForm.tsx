interface FormProps {
  data: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function AssistantForm({ data, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-frame-mono text-[0.62rem] tracking-[0.17em] uppercase text-frame-orange mb-3">
          // Assistente Consultivo
        </p>
        <div className="space-y-3">
          <div>
            <label className="block font-frame-mono text-[0.62rem] tracking-[0.11em] uppercase text-frame-gray-light mb-1">
              Sua Dúvida ou Consulta
            </label>
            <textarea
              value={data.prompt || ""}
              onChange={(e) => onChange("prompt", e.target.value)}
              placeholder="Ex: Como estruturar um plano de contingência para filmagens na chuva? Quais os microfones indicados para som direto em externa com vento?"
              rows={6}
              className="bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-3 py-2 text-[0.8rem] rounded-none outline-none w-full font-frame-body transition resize-y"
            />
          </div>
          <p className="font-frame-mono text-[0.62rem] text-frame-gray-muted leading-relaxed">
            Dica: Após gerar a resposta inicial no painel direito, você pode usar a aba "Refinar com IA" para continuar a conversa e detalhar as respostas da IA.
          </p>
        </div>
      </div>
    </div>
  );
}
