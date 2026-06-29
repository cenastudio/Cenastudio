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
        "Geração concluída! Use este chat para pedir ajustes, expansões ou correções específicas no documento ao lado.",
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
    <div className="studio-chat-panel flex-1 flex flex-col overflow-hidden select-none">
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
                className={`frame-chat-avatar ${
                  isUser
                    ? "frame-chat-avatar--user"
                    : "frame-chat-avatar--assistant"
                }`}
              >
                {isUser ? "U" : "F"}
              </div>

              {/* Bubble */}
              <div
                className={`frame-chat-bubble ${isUser ? "frame-chat-bubble--user" : "frame-chat-bubble--assistant"}`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* AI Loading State */}
        {isProcessing && (
          <div className="frame-chat-loading">
            <span>Orquestrando refinamento IA</span>
            <div className="flex gap-1">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Row */}
      <div className="p-4 border-t border-[var(--ds-border)] bg-[var(--ds-surface-1)] flex gap-2 shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ex: reescreva a cena 2 com mais tensão dramática..."
          rows={2}
          className="frame-input flex-1 resize-none min-h-[44px] max-h-[120px]"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={isProcessing || !input.trim()}
          className="frame-btn-primary px-4 flex items-center justify-center shrink-0 self-end py-3 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
