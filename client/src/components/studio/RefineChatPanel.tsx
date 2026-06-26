import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "ai";
  content: string;
}

interface RefineChatPanelProps {
  toolId: string;
  currentOutput: string;
  onRefineComplete: (newOutput: string) => void;
}

export default function RefineChatPanel({
  toolId,
  currentOutput,
  onRefineComplete,
}: RefineChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content:
        "Geração concluída! Use este chat para pedir ajustes, expansões ou correções específicas no documento ao lado. 🎬",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!currentOutput) {
      toast.error("Gere um documento no formulário antes de refinar!");
      return;
    }

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsProcessing(true);

    try {
      const refinementPrompt = `Por favor, ajuste o resultado anterior da ferramenta de acordo com esta instrução. Responda apenas com o novo resultado completo da ferramenta formatado em formato profissional, sem introduções, saudações ou explicações secundárias.

[Resultado Anterior]:
${currentOutput}

[Instrução de Refinamento do Filmmaker]:
${userMessage}`;

      const result = await api.ai.generate(toolId, { prompt: refinementPrompt });

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "Ajuste aplicado com sucesso! O documento ao lado foi atualizado.",
        },
      ]);
      onRefineComplete(result.output);
      toast.success("Ajuste aplicado!");
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Erro ao aplicar refinamento";
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: `Falha ao processar o ajuste: ${errMsg}`,
        },
      ]);
      toast.error(errMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-frame-black select-none">
      {/* Chat Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={i}
              className={`flex gap-3 max-w-[85%] ${
                isUser ? "flex-row-reverse ml-auto" : "mr-auto"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-frame-mono text-[0.6rem] font-semibold shrink-0 select-none ${
                  isUser
                    ? "bg-frame-gray-3 text-frame-white border border-frame-gray-3"
                    : "bg-frame-orange text-frame-black"
                }`}
              >
                {isUser ? "U" : "F"}
              </div>

              {/* Bubble */}
              <div
                className={`p-3 font-frame-body text-[0.8rem] leading-relaxed rounded-[2px] ${
                  isUser
                    ? "bg-frame-gray-2 border-r-2 border-frame-gray-3 text-frame-white"
                    : "bg-frame-gray-1 border-l-2 border-frame-orange text-frame-cream"
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* AI Loading State */}
        {isProcessing && (
          <div className="flex items-center gap-2.5 px-4 font-frame-mono text-[0.6rem] text-frame-orange py-1">
            <span>Orquestrando refinamento IA</span>
            <div className="flex gap-1">
              <span className="w-1 h-1 rounded-full bg-frame-orange animate-bounce delay-100" />
              <span className="w-1 h-1 rounded-full bg-frame-orange animate-bounce delay-200" />
              <span className="w-1 h-1 rounded-full bg-frame-orange animate-bounce delay-300" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Row */}
      <div className="p-4 border-t border-frame-gray-2 bg-frame-gray-1 flex gap-2 shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ex: reescreva a cena 2 com mais tensão dramática..."
          rows={2}
          className="flex-1 bg-frame-gray-1 border border-frame-gray-3 text-frame-white px-3 py-2 font-frame-body text-[0.8rem] outline-none transition resize-none focus:border-frame-orange rounded-none min-h-[44px] max-h-[120px]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isProcessing || !input.trim()}
          className="bg-frame-orange text-frame-black border-none px-4 flex items-center justify-center font-frame-mono text-[0.62rem] tracking-[0.1em] uppercase font-medium transition hover:bg-frame-orange-dark disabled:opacity-40 self-end py-3 cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
