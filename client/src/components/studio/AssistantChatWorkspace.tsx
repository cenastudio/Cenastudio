import { useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, type ToolFromApi } from "@/lib/api";
import { Bot, Copy, Loader2, Send, Trash2, UserRound, Sparkles, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProject } from "@/contexts/ProjectContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AssistantChatWorkspaceProps {
  tool: ToolFromApi;
  projectId?: number | null;
}

// Context messages that appear as pre-configured suggestions based on project state
const CONTEXT_PROMPTS = [
  { label: "Pré-produção", prompt: "Estou em pré-produção do meu projeto. Que documentos devo preparar primeiro e em que ordem?" },
  { label: "No set agora", prompt: "Estou no set agora com um problema de iluminação. Precisa de uma solução rápida e prática." },
  { label: "Como precificar", prompt: "Como devo calcular o preço de um vídeo institucional de 3 minutos com 2 dias de filmagem?" },
  { label: "Melhorar copy", prompt: "Como posso melhorar a proposta que acabei de gerar para ser mais persuasiva para o cliente?" },
];

export default function AssistantChatWorkspace({ tool, projectId }: AssistantChatWorkspaceProps) {
  const { t } = useLanguage();
  const { activeProject } = useProject();

  const starterPrompts: never[] = [];

  // Build greeting with project context if available
  const greeting = useMemo(() => {
    if (activeProject) {
      return `Olá! Sou seu assistente de produção audiovisual.\n\nEstou conectado ao projeto "${activeProject.name}". Posso ajudar com dúvidas técnicas, revisão de documentos já gerados, estratégia comercial ou qualquer questão do job.\n\nO que você precisa?`;
    }
    return t("app.studio.assistant.greeting") as string;
  }, [activeProject]);

  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [projectHistory, setProjectHistory] = useState<Array<{ toolId: string; output: string }>>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load recent generations from current project for context
  useEffect(() => {
    if (!projectId) { setProjectHistory([]); return; }
    api.ai.history("12", projectId).then((data) => {
      // Get latest generation per tool from history
      const byTool = new Map<string, string>();
      for (const item of data) {
        if (!byTool.has(item.toolId)) byTool.set(item.toolId, item.output);
      }
      setProjectHistory(Array.from(byTool.entries()).map(([toolId, output]) => ({ toolId, output })));
    }).catch(() => {});
  }, [projectId]);

  // Build project context for AI prompts
  const projectContextBlock = useMemo(() => {
    if (!activeProject && projectHistory.length === 0) return "";
    const TOOL_NAMES: Record<string, string> = {
      "01": "Roteiro", "02": "Decupagem", "03": "Callsheet", "04": "Orçamento",
      "05": "Proposta", "06": "Contrato", "07": "Briefing", "08": "Moodboard",
      "09": "Checklist", "10": "Cronograma", "11": "Relatório de Entrega",
    };
    const lines = ["[CONTEXTO DO PROJETO ATIVO]"];
    if (activeProject) lines.push(`Projeto: ${activeProject.name}`);
    if (projectHistory.length > 0) {
      lines.push("Documentos já gerados neste job:");
      for (const doc of projectHistory.slice(0, 4)) {
        const name = TOOL_NAMES[doc.toolId] || `Ferramenta ${doc.toolId}`;
        const preview = doc.output.slice(0, 400).replace(/\n/g, " ");
        lines.push(`[${name}]: ${preview}...`);
      }
    }
    lines.push("[FIM DO CONTEXTO]");
    return "\n\n" + lines.join("\n");
  }, [activeProject, projectHistory]);

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
      const context = `${projectContextBlock}\n\n${conversationPrompt}\n\nUsuário: ${clean}\n\nResponda como conversa direta, objetiva e prática.`;
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
          {activeProject && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <FolderOpen className="w-3 h-3 text-frame-orange" />
              <span className="font-frame-mono text-[0.58rem] text-frame-orange uppercase tracking-wider">
                {activeProject.name}
                {projectHistory.length > 0 && ` · ${projectHistory.length} doc${projectHistory.length > 1 ? "s" : ""} no contexto`}
              </span>
            </div>
          )}
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
          {/* Context prompts based on project state */}
          {CONTEXT_PROMPTS.slice(0, activeProject ? 4 : 2).map((cp) => (
            <button
              key={cp.label}
              type="button"
              onClick={() => sendMessage(cp.prompt)}
              disabled={isSending}
              className="frame-btn-ghost text-[0.6rem] px-2.5 py-1.5 flex items-center gap-1"
            >
              <Sparkles className="w-2.5 h-2.5 text-frame-orange" />
              {cp.label}
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
