import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info, Trash2, X } from "lucide-react";
import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export type ConfirmDialogVariant = "delete" | "warning" | "info";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
  itemName?: string;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = "delete",
  isLoading = false,
  itemName,
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  const variantConfig = {
    delete: {
      icon: Trash2,
      iconColor: "text-frame-red",
      iconBg: "bg-frame-red/10",
      borderColor: "border-frame-red/30",
      bgColor: "bg-frame-red/5",
      confirmButton: "bg-frame-red hover:bg-red-600 text-white",
      defaultConfirmText: t("app.confirmDialog.delete"),
    },
    warning: {
      icon: AlertTriangle,
      iconColor: "text-yellow-400",
      iconBg: "bg-yellow-400/10",
      borderColor: "border-yellow-400/30",
      bgColor: "bg-yellow-400/5",
      confirmButton: "bg-yellow-500 hover:bg-yellow-600 text-frame-black",
      defaultConfirmText: t("app.confirmDialog.confirm"),
    },
    info: {
      icon: Info,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-400/10",
      borderColor: "border-blue-400/30",
      bgColor: "bg-blue-400/5",
      confirmButton: "bg-blue-500 hover:bg-blue-600 text-white",
      defaultConfirmText: t("app.confirmDialog.continue"),
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;
  const resolvedCancelText = cancelText ?? t("app.confirmDialog.cancel");

  // Close on ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, isLoading, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={!isLoading ? onClose : undefined}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998]"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-md bg-frame-gray-1 border border-frame-gray-3 shadow-2xl font-frame-body"
              role="alertdialog"
              aria-labelledby="confirm-dialog-title"
              aria-describedby="confirm-dialog-description"
            >
              {/* Header */}
              <div className="flex items-start justify-between p-5 border-b border-frame-gray-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`p-2 rounded-lg ${config.iconBg}`}>
                    <Icon className={`w-5 h-5 ${config.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2
                      id="confirm-dialog-title"
                      className="text-lg font-semibold text-frame-white"
                    >
                      {title}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="shrink-0 p-1 hover:bg-frame-gray-2 rounded transition disabled:opacity-50 disabled:pointer-events-none"
                  aria-label={t("app.confirmDialog.close")}
                >
                  <X className="w-5 h-5 text-frame-gray-light" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <p
                  id="confirm-dialog-description"
                  className="text-sm text-frame-gray-light leading-relaxed"
                >
                  {description}
                </p>

                {itemName && (
                  <div
                    className={`border ${config.borderColor} ${config.bgColor} p-4 rounded`}
                  >
                    <p className="text-sm font-medium text-frame-white">
                      {itemName}
                    </p>
                  </div>
                )}

                {variant === "delete" && (
                  <div className="flex items-start gap-2 text-xs text-frame-gray-light">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                    <p>{t("app.confirmDialog.cannotBeUndone")}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-5 border-t border-frame-gray-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="frame-btn-ghost disabled:opacity-50 disabled:pointer-events-none"
                >
                  {resolvedCancelText}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isLoading}
                  className={`px-4 py-2 text-sm font-frame-mono uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed ${config.confirmButton}`}
                >
                  {isLoading ? t("app.confirmDialog.processing") : confirmText || config.defaultConfirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
