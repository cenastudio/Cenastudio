import { useMemo, useRef, useState } from "react";
import { ApiError, api, type ToolFromApi } from "@/lib/api";
import { Bot, Copy, Loader2, Send, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AssistantChatWorkspaceProps {
  tool: ToolFromApi;
  projectId?: number | null;
}

const starterPrompts: string[] = [];

export default function AssistantChatWorkspace({ tool, projectId }: AssistantChatWorkspaceProps) {
  const { t } = useLanguage();
  const starterPrompts = [
    t("app.studio.assistant.starter1") as string,
    t("app.studio.assistant.starter2") as string,
    t("app.studio.assistant.starter3") as string,
  ];
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: t("app.studio.assistant.greeting") as string,
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const conversationPrompt = useMemo(
    () =>
      messages
        .map((message) => `${message.role === "user" ? t("app.studio.assistant.user") as string : t("app.studio.assistant.assistant") as string}: ${message.content}`)
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
            : t("app.studio.assistant.chatError") as string;
      toast.error(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: message.toLowerCase().includes("atingiu") || message.toLowerCase().includes("plano")
            ? `${t("app.studio.assistant.noQuota") as string}\n\n${message}\n\n${t("app.studio.assistant.adminHint") as string}`
            : `${t("app.studio.assistant.failedResponse") as string}\n\n${t("app.studio.assistant.errorPrefix") as string} ${message}\n\n${t("app.studio.assistant.retryHint") as string}`,
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
        content: t("app.studio.assistant.chatCleared") as string,
      },
    ]);
  };

  return (
    <div className="studio-chat-panel flex-1 min-w-0 flex flex-col border-t lg:border-t-0 border-[var(--ds-border)]">
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--ds-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="frame-label mb-1">{t("app.studio.assistant.headerLabel") as string}</p>
          <h2 className="frame-title text-[clamp(1.6rem,3vw,2.5rem)] leading-none">{t("app.studio.assistant.headerTitle") as string}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(messages.map((m) => `${m.role}: ${m.content}`).join("\n\n"));
              toast.success(t("app.studio.assistant.chatCopied") as string);
            }}
            className="frame-btn-ghost flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            {t("app.studio.copy") as string}
          </button>
          <button type="button" onClick={clearChat} className="frame-btn-ghost flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            {t("app.studio.clear") as string}
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-4">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
            {message.role === "assistant" && (
              <div className="frame-chat-avatar frame-chat-avatar--assistant">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`frame-chat-bubble ${message.role === "user" ? "frame-chat-bubble--user" : "frame-chat-bubble--assistant"}`}
            >
              {message.content}
            </div>
            {message.role === "user" && (
              <div className="frame-chat-avatar frame-chat-avatar--user">
                <UserRound className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        {isSending && (
          <div className="frame-chat-loading">
            <span>{t("app.studio.assistant.thinking") as string}</span>
            <div className="flex gap-1">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-[var(--ds-border)] p-4 sm:p-5">
        <div className="flex flex-wrap gap-2 mb-3">
          {starterPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => sendMessage(prompt)}
              disabled={isSending}
              className="frame-btn-ghost text-[0.62rem] px-3 py-2"
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
            placeholder={t("app.studio.assistant.inputPlaceholder") as string}
            rows={2}
            className="frame-input flex-1 resize-none min-h-[44px] max-h-[120px]"
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
