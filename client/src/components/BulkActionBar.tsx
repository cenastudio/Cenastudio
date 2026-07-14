/**
 * BulkActionBar - Barra de ações para itens selecionados
 *
 * Aparece quando há itens selecionados e oferece ações em massa
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Archive, Download, Mail, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export interface BulkAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: "default" | "danger" | "success";
  disabled?: boolean;
  loading?: boolean;
}

interface BulkActionBarProps {
  selectedCount: number;
  onDeselectAll: () => void;
  actions: BulkAction[];
  position?: "top" | "bottom";
}

export function BulkActionBar({
  selectedCount,
  onDeselectAll,
  actions,
  position = "top"
}: BulkActionBarProps) {
  const { t } = useLanguage();

  if (selectedCount === 0) return null;

  const positionClasses = position === "bottom"
    ? "bottom-6 left-1/2 -translate-x-1/2"
    : "top-6 left-1/2 -translate-x-1/2";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: position === "bottom" ? 20 : -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: position === "bottom" ? 20 : -20, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`fixed ${positionClasses} z-40 flex items-center gap-3 bg-frame-black border border-frame-orange/40 shadow-2xl px-5 py-3 min-w-[400px] max-w-2xl`}
      >
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-3 border-r border-frame-gray-3">
          <div className="w-6 h-6 bg-frame-orange/20 border border-frame-orange/40 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-frame-orange" />
          </div>
          <span className="font-frame-mono text-sm text-frame-white">
            {selectedCount} {t("app.common.selected") || "selecionado(s)"}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-1">
          {actions.map((action) => {
            const Icon = action.icon;
            const variantClasses = {
              default: "hover:bg-frame-gray-1/50 hover:border-frame-orange/50 hover:text-frame-white",
              danger: "hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400",
              success: "hover:bg-green-500/10 hover:border-green-500/50 hover:text-green-400",
            }[action.variant || "default"];

            return (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={`
                  flex items-center gap-2 px-3 py-1.5 border border-frame-gray-3 text-frame-gray-light text-xs transition
                  ${variantClasses}
                  ${action.disabled ? "opacity-50 cursor-not-allowed" : ""}
                  ${action.loading ? "opacity-70" : ""}
                `}
              >
                <Icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            );
          })}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onDeselectAll}
          className="p-1.5 hover:bg-frame-gray-1/50 transition border border-frame-gray-3 hover:border-frame-orange/50 ml-2"
          title={t("app.common.deselectAll") || "Desselecionar todos"}
        >
          <X className="w-3.5 h-3.5 text-frame-gray-light hover:text-frame-white" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Pre-configured bulk actions for common use cases
 */
export const BULK_ACTIONS = {
  DELETE: (onClick: () => void): BulkAction => ({
    id: "delete",
    label: "Deletar",
    icon: Trash2,
    onClick,
    variant: "danger",
  }),
  ARCHIVE: (onClick: () => void): BulkAction => ({
    id: "archive",
    label: "Arquivar",
    icon: Archive,
    onClick,
    variant: "default",
  }),
  EXPORT: (onClick: () => void): BulkAction => ({
    id: "export",
    label: "Exportar",
    icon: Download,
    onClick,
    variant: "default",
  }),
  EMAIL: (onClick: () => void): BulkAction => ({
    id: "email",
    label: "Enviar email",
    icon: Mail,
    onClick,
    variant: "default",
  }),
};
