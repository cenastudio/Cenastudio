import * as React from "react";
import { ChecklistItem } from "./ChecklistItem";
import { cn } from "@/lib/utils";

export interface ChecklistTask {
  id: string;
  text: string;
  checked: boolean;
  link?: string;
}

export interface ChecklistColumnProps {
  items: ChecklistTask[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onCreate: (text: string) => void;
}

export function ChecklistColumn({
  items,
  onToggle,
  onDelete,
  onCreate,
}: ChecklistColumnProps) {
  const [inputValue, setInputValue] = React.useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmedValue = inputValue.trim();

      if (trimmedValue) {
        onCreate(trimmedValue);
        setInputValue("");
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-6 p-6 rounded-3xl",
        "bg-gradient-to-br from-white/[0.03] to-transparent",
        "backdrop-blur-sm border border-white/[0.08]",
        "w-full lg:w-[30%]"
      )}
      style={{
        padding: "24px",
        borderRadius: "24px",
      }}
      data-testid="checklist-column"
    >
      {/* Title */}
      <h2
        className="text-xs font-frame-mono uppercase tracking-wider text-[var(--ds-text-2)]"
        style={{
          fontSize: "0.875rem",
        }}
      >
        ✓ MINHAS TAREFAS
      </h2>

      {/* Items List or Empty State */}
      {items.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-8 text-center"
          data-testid="empty-state"
        >
          <p className="text-sm text-[var(--ds-text-3)] mb-2">
            Sua checklist está vazia
          </p>
          <p className="text-xs text-[var(--ds-text-4)]">
            Adicione sua primeira tarefa abaixo
          </p>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-3",
            "overflow-y-auto smooth-scroll",
            "pr-2"
          )}
          style={{
            maxHeight: "400px",
          }}
          data-testid="checklist-items-container"
        >
          {items.map((item) => (
            <ChecklistItem
              key={item.id}
              id={item.id}
              text={item.text}
              checked={item.checked}
              link={item.link}
              onClick={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="mt-auto pt-2 border-t border-white/[0.08]">
        <input
          type="text"
          placeholder="+ Nova tarefa"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full px-3 py-2 text-sm",
            "bg-white/[0.02] border border-white/[0.08]",
            "rounded-lg",
            "text-[var(--ds-text-1)] placeholder:text-[var(--ds-text-4)]",
            "focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]/50",
            "transition-all duration-200"
          )}
          data-testid="checklist-input"
        />
      </div>
    </div>
  );
}
