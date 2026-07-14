/**
 * KeyboardShortcutsModal - Modal com todos os atalhos disponíveis
 *
 * Exibido ao pressionar Shift+? ou pelo menu
 */

import { motion, AnimatePresence } from "framer-motion";
import { X, Command, Keyboard } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatShortcut, type KeyboardShortcut } from "@/hooks/useKeyboardShortcuts";

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string;
    description: string;
  }>;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const { t } = useLanguage();

  // Definir grupos de atalhos
  const shortcutGroups: ShortcutGroup[] = [
    {
      title: t("app.shortcuts.navigation") || "Navegação",
      shortcuts: [
        { keys: "⌘ K / Ctrl K", description: t("app.shortcuts.commandPalette") || "Abrir Command Palette" },
        { keys: "/", description: t("app.shortcuts.search") || "Buscar" },
        { keys: "Esc", description: t("app.shortcuts.closeModal") || "Fechar modal/dropdown" },
        { keys: "?", description: t("app.shortcuts.showHelp") || "Mostrar atalhos" },
      ]
    },
    {
      title: t("app.shortcuts.actions") || "Ações Rápidas",
      shortcuts: [
        { keys: "N", description: t("app.shortcuts.newProject") || "Novo projeto" },
        { keys: "C", description: t("app.shortcuts.newClient") || "Novo cliente" },
        { keys: "P", description: t("app.shortcuts.newProposal") || "Nova proposta" },
      ]
    },
    {
      title: t("app.shortcuts.selection") || "Seleção",
      shortcuts: [
        { keys: "⌘ A / Ctrl A", description: t("app.shortcuts.selectAll") || "Selecionar todos" },
        { keys: "Shift + Click", description: t("app.shortcuts.multiSelect") || "Seleção múltipla" },
        { keys: "⌘ D / Ctrl D", description: t("app.shortcuts.deselectAll") || "Desselecionar todos" },
      ]
    },
    {
      title: t("app.shortcuts.lists") || "Listas",
      shortcuts: [
        { keys: "↑ ↓", description: t("app.shortcuts.navigate") || "Navegar itens" },
        { keys: "Enter", description: t("app.shortcuts.open") || "Abrir item selecionado" },
        { keys: "Delete", description: t("app.shortcuts.delete") || "Deletar selecionados" },
      ]
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-3xl bg-frame-black border border-frame-gray-3 shadow-2xl max-h-[85vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="border-b border-frame-gray-3 p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border border-frame-orange/30 bg-frame-orange/10 flex items-center justify-center">
                    <Keyboard className="w-5 h-5 text-frame-orange" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-frame-white">
                      {t("app.shortcuts.title") || "Atalhos de Teclado"}
                    </h2>
                    <p className="text-xs text-frame-gray-light mt-0.5">
                      {t("app.shortcuts.subtitle") || "Aumente sua produtividade com atalhos"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 hover:bg-frame-gray-1/50 transition border border-frame-gray-3 hover:border-frame-orange/50"
                >
                  <X className="w-4 h-4 text-frame-gray-light" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto p-6 space-y-6">
                {shortcutGroups.map((group, groupIndex) => (
                  <motion.div
                    key={group.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.05 }}
                  >
                    <h3 className="font-frame-mono text-[0.6rem] uppercase tracking-wider text-frame-orange mb-3">
                      {group.title}
                    </h3>
                    <div className="space-y-2">
                      {group.shortcuts.map((shortcut, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between border border-frame-gray-3/50 bg-frame-gray-1/20 p-3 hover:bg-frame-gray-1/40 transition"
                        >
                          <span className="text-sm text-frame-white">
                            {shortcut.description}
                          </span>
                          <kbd className="font-frame-mono text-xs px-2.5 py-1.5 bg-frame-gray-2 border border-frame-gray-3 text-frame-white rounded">
                            {shortcut.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}

                {/* Footer tip */}
                <div className="border border-frame-orange/25 bg-frame-orange/[0.06] p-4 mt-6">
                  <p className="text-xs text-frame-gray-light leading-relaxed">
                    <strong className="text-frame-orange">💡 Dica:</strong>{" "}
                    {t("app.shortcuts.tip") || "Pressione ? a qualquer momento para ver esta lista novamente."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
