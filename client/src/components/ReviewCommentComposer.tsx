import { Clock3, Send, User } from "lucide-react";

interface ReviewCommentComposerProps {
  currentTimestamp: number;
  anchorTimestamp: number | null;
  comment: string;
  onCommentChange: (value: string) => void;
  authorName?: string;
  onAuthorNameChange?: (value: string) => void;
  onBegin: () => void;
  onRecapture: () => void;
  onSubmit: () => void;
  submitting?: boolean;
}

function formatTimestamp(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const secs = Math.floor(safeSeconds % 60);
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    : `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function ReviewCommentComposer({
  currentTimestamp,
  anchorTimestamp,
  comment,
  onCommentChange,
  authorName,
  onAuthorNameChange,
  onBegin,
  onRecapture,
  onSubmit,
  submitting = false,
}: ReviewCommentComposerProps) {
  const timestamp = anchorTimestamp ?? currentTimestamp;
  const canSubmit = comment.trim() && (onAuthorNameChange ? authorName?.trim() : true);

  return (
    <div className="border-t border-frame-gray-3 bg-frame-gray-1/70 p-3 sm:p-4">
      {onAuthorNameChange && (
        <label className="mb-2 flex items-center gap-2 border border-frame-gray-3 bg-frame-black px-3 py-2 focus-within:border-frame-orange">
          <User className="h-3.5 w-3.5 shrink-0 text-frame-gray-light" />
          <input
            value={authorName}
            onChange={(event) => onAuthorNameChange(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-frame-white outline-none"
            placeholder="Seu nome"
            autoComplete="name"
          />
        </label>
      )}

      <div className="border border-frame-gray-3 bg-frame-black focus-within:border-frame-orange">
        <textarea
          value={comment}
          onFocus={onBegin}
          onChange={(event) => {
            if (anchorTimestamp === null) onBegin();
            onCommentChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSubmit && !submitting) onSubmit();
            }
          }}
          className="block min-h-20 w-full resize-none bg-transparent px-3 py-3 text-sm leading-relaxed text-frame-white outline-none placeholder:text-frame-gray-muted"
          placeholder="Escreva o ajuste neste ponto do vídeo..."
        />

        <div className="flex items-center justify-between gap-2 border-t border-frame-gray-3 px-2 py-2">
          <button
            type="button"
            onClick={onRecapture}
            className="flex min-w-0 items-center gap-1.5 px-1.5 py-1 font-frame-mono text-[0.64rem] uppercase text-frame-orange hover:text-frame-white"
            title="Fixar comentário no tempo atual"
          >
            <Clock3 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{anchorTimestamp === null ? "Tempo atual" : "Fixado"} {formatTimestamp(timestamp)}</span>
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit || submitting}
            className="flex h-8 items-center gap-2 bg-frame-orange px-3 font-frame-mono text-[0.64rem] uppercase text-frame-black transition hover:bg-frame-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
