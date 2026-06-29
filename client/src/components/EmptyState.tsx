import { memo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const EmptyState = memo(function EmptyState({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`border border-dashed border-frame-gray-3 px-5 py-10 text-center sm:p-12 ${className}`}>
      <Icon className="w-10 h-10 text-frame-gray-light mx-auto mb-4" aria-hidden="true" />
      <p className="text-frame-white text-sm font-medium mb-1">{title}</p>
      {description && <p className="text-frame-gray-light text-sm leading-relaxed mb-5 max-w-md mx-auto">{description}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="frame-btn-primary inline-flex items-center gap-2 text-sm">
          {action.label}
        </button>
      )}
    </div>
  );
});

export default EmptyState;
