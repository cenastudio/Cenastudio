import React, { useEffect, useId } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";

interface AnimatedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export default function AnimatedModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  className = "",
}: AnimatedModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const reduceMotion = useReducedMotion();
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

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className={`pointer-events-auto w-full ${className || "max-w-2xl"}`}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-frame-black border border-frame-gray-3 text-frame-white w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descriptionId : undefined}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-6 pb-4 border-b border-frame-gray-3">
                <div className="flex-1 min-w-0 pr-4">
                  <h2 id={titleId} className="font-bold text-xl tracking-tight text-frame-white">
                    {title}
                  </h2>
                  {description && (
                    <p id={descriptionId} className="text-frame-gray-light text-sm mt-1">{description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-frame-gray-light hover:text-frame-white transition-colors p-1 hover:bg-frame-gray-3 shrink-0"
                  aria-label="Fechar"
                  autoFocus
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="text-sm">{children}</div>

              {/* Footer */}
              {footer && (
                <div className="mt-6 pt-4 border-t border-frame-gray-3 flex items-center justify-end gap-3">
                  {footer}
                </div>
              )}
            </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
