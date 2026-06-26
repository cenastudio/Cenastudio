import { useMemo, useRef, useState } from "react";
import { ApiError, api, type ToolFromApi } from "@/lib/api";
import { Bot, Copy, Loader2, Send, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AssistantChatWorkspaceProps {
  tool: ToolFromApi;
  projectId?: number | null;
}

const starterPrompts = [
  "Me ajude a estruturar o workflow de aprovação com cliente.",
  "Crie um checklist de filmagem para externa com risco de chuva.",
  "Como eu organizo orçamento, cronograma e equipe para um job comercial?",
];

export default function AssistantChatWorkspace({ tool, projectId }: AssistantChatWorkspaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Olá. Sou seu assistente de produção audiovisual. Pode falar comigo como em um chat: briefing, orçamento, roteiro, set, pós, contrato, cliente ou dúvidas rápidas.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationPrompt = useMemo(
    () =>
      messages
        .map((message) => `${message.role === "user" ? "Usuário" : "Assistente"}: ${message.content}`)
        .join("\n\n"),
    [messages],
  );

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const sendMessage = async (text = input) => {
    const clean = text.trim();
    if (!clean || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: clean }];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    scrollToBottom();

    try {
      const context = `${conversationPrompt}\n\nUsuário: ${clean}\n\nResponda como conversa direta, objetiva e prática.`;
      const result = await api.ai.generate(tool.id, { prompt: context }, projectId);
      setMessages((current) => [...current, { role: "assistant", content: result.output }]);
      scrollToBottom();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Erro ao falar com a IA";
      toast.error(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "Não consegui responder agora. Se estiver no deploy, confirme se a chave NVIDIA está configurada na Vercel e tente novamente.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content:
          "Chat limpo. Me diga o que você quer resolver agora: produção, roteiro, cliente, orçamento, aprovação ou operação do studio.",
      },
    ]);
  };

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-frame-black border-t lg:border-t-0 border-frame-gray-2">
      <div className="px-4 sm:px-6 py-4 border-b border-frame-gray-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="frame-label mb-1">// ASSISTENTE LIVRE</p>
          <h2 className="frame-title text-[clamp(1.6rem,3vw,2.5rem)] leading-none">CHAT DE PRODUÇÃO</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(messages.map((m) => `${m.role}: ${m.content}`).join("\n\n"));
              toast.success("Conversa copiada");
            }}
            className="frame-btn-ghost flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Copiar
          </button>
          <button type="button" onClick={clearChat} className="frame-btn-ghost flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Limpar
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && (
              <div className="w-9 h-9 border border-frame-orange/40 bg-frame-orange/10 text-frame-orange flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[min(760px,86vw)] border px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                message.role === "user"
                  ? "border-frame-orange/40 bg-frame-orange text-frame-black"
                  : "border-frame-gray-3 bg-frame-gray-1/40 text-frame-cream"
              }`}
            >
              {message.content}
            </div>
            {message.role === "user" && (
              <div className="w-9 h-9 border border-frame-gray-3 bg-frame-gray-2 text-frame-white flex items-center justify-center shrink-0">
                <UserRound className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {isSending && (
          <div className="flex items-center gap-3 text-frame-gray-light text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-frame-orange" />
            Pensando...
          </div>
        )}
      </div>

      <div className="border-t border-frame-gray-2 p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={isSending}
              className="px-3 py-2 border border-frame-gray-3 text-frame-gray-light hover:border-frame-orange hover:text-frame-orange text-[0.68rem] font-frame-mono uppercase tracking-wider transition disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Escreva sua dúvida livremente..."
            rows={2}
            className="flex-1 bg-frame-gray-1 border border-frame-gray-3 focus:border-frame-orange text-frame-white px-4 py-3 text-sm rounded-none outline-none resize-none"
          />
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={isSending || !input.trim()}
            className="frame-btn-primary px-5 flex items-center justify-center disabled:opacity-50"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
