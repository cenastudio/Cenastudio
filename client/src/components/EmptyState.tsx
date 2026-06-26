import { memo } from "react";
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
    <div className={`border border-dashed border-frame-gray-3 p-12 text-center ${className}`}>
      <Icon className="w-12 h-12 text-frame-gray-light mx-auto mb-4" />
      <p className="text-frame-gray-light text-sm mb-1">{title}</p>
      {description && <p className="text-frame-gray-muted text-xs mb-4">{description}</p>}
      {action && (
        <button type="button" onClick={action.onClick} className="frame-btn-primary inline-flex items-center gap-2 text-sm">
          {action.label}
        </button>
      )}
    </div>
  );
});

export default EmptyState;
