/**
 * useKeyboardShortcuts - Sistema de atalhos de teclado global
 *
 * Gerencia atalhos de teclado de forma centralizada com suporte a:
 * - Combinações (Ctrl, Cmd, Alt, Shift)
 * - Prevenção de conflitos com inputs
 * - Descrições para documentação
 * - Enable/disable dinâmico
 */

import { useEffect, useCallback } from "react";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean; // Cmd no Mac
  alt?: boolean;
  shift?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
  enabled?: boolean;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enableInInputs?: boolean; // Default: false
  scope?: string; // Para debug
}

// Lista de elementos onde normalmente não queremos atalhos
const INPUT_ELEMENTS = ['INPUT', 'TEXTAREA', 'SELECT'];

function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  return INPUT_ELEMENTS.includes(element.tagName);
}

function isContentEditable(element: Element | null): boolean {
  if (!element) return false;
  return element.getAttribute('contenteditable') === 'true';
}

function matchesShortcut(event: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  // Check key (case-insensitive)
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  // Check modifiers
  if (shortcut.ctrl && !event.ctrlKey) return false;
  if (!shortcut.ctrl && event.ctrlKey) return false;

  if (shortcut.meta && !event.metaKey) return false;
  if (!shortcut.meta && event.metaKey) return false;

  if (shortcut.alt && !event.altKey) return false;
  if (!shortcut.alt && event.altKey) return false;

  if (shortcut.shift && !event.shiftKey) return false;
  if (!shortcut.shift && event.shiftKey) return false;

  return true;
}

export function useKeyboardShortcuts({
  shortcuts,
  enableInInputs = false,
  scope
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Skip if in input/textarea/select and not explicitly enabled
      if (!enableInInputs && (isInputElement(event.target as Element) || isContentEditable(event.target as Element))) {
        return;
      }

      // Find matching shortcut
      for (const shortcut of shortcuts) {
        // Skip if disabled
        if (shortcut.enabled === false) continue;

        if (matchesShortcut(event, shortcut)) {
          // Prevent default if requested
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }

          // Execute action
          try {
            shortcut.action();
          } catch (error) {
            console.error(`[useKeyboardShortcuts${scope ? ` ${scope}` : ''}] Error executing shortcut:`, error);
          }

          // Only execute first match
          break;
        }
      }
    },
    [shortcuts, enableInInputs, scope]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Helper para formatar shortcut como string legível
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.meta) parts.push(navigator.platform.includes('Mac') ? '⌘' : 'Cmd');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.shift) parts.push('Shift');

  // Capitalize key
  const key = shortcut.key.toUpperCase();
  parts.push(key);

  return parts.join(' + ');
}

/**
 * Lista de atalhos globais padrão do Cena Studio
 */
export const GLOBAL_SHORTCUTS_CONFIG = {
  COMMAND_PALETTE: { key: 'k', meta: true, ctrl: true, description: 'Abrir Command Palette' },
  NEW_PROJECT: { key: 'n', description: 'Novo projeto' },
  NEW_CLIENT: { key: 'c', description: 'Novo cliente' },
  SEARCH: { key: '/', description: 'Buscar' },
  CLOSE_MODAL: { key: 'Escape', description: 'Fechar modal' },
  HELP: { key: '?', shift: true, description: 'Mostrar atalhos disponíveis' },
} as const;
