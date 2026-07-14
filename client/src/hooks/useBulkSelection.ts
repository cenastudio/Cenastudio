/**
 * useBulkSelection - Hook para seleção múltipla em listas
 *
 * Gerencia estado de seleção com suporte a:
 * - Select all / Deselect all
 * - Toggle individual
 * - Atalhos de teclado (Ctrl+A, Ctrl+D)
 * - Range selection (Shift+Click)
 */

import { useState, useCallback, useEffect } from "react";

export interface BulkSelectionOptions<T> {
  items: T[];
  getId: (item: T) => string | number;
  onSelectionChange?: (selected: T[]) => void;
  enableKeyboardShortcuts?: boolean;
}

export function useBulkSelection<T>({
  items,
  getId,
  onSelectionChange,
  enableKeyboardShortcuts = true
}: BulkSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);

  // Get selected items
  const selectedItems = items.filter(item => selectedIds.has(getId(item)));
  const selectedCount = selectedIds.size;
  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedItems);
    }
  }, [selectedIds.size]); // Only trigger when count changes

  // Select all
  const selectAll = useCallback(() => {
    const newSet = new Set<string | number>();
    items.forEach(item => newSet.add(getId(item)));
    setSelectedIds(newSet);
  }, [items, getId]);

  // Deselect all
  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(-1);
  }, []);

  // Toggle selection of a single item
  const toggleSelection = useCallback((item: T, index?: number) => {
    const id = getId(item);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });

    if (index !== undefined) {
      setLastSelectedIndex(index);
    }
  }, [getId]);

  // Range selection (Shift+Click)
  const rangeSelection = useCallback((item: T, currentIndex: number) => {
    if (lastSelectedIndex === -1) {
      // No previous selection, just select current
      toggleSelection(item, currentIndex);
      return;
    }

    // Select range between last and current
    const start = Math.min(lastSelectedIndex, currentIndex);
    const end = Math.max(lastSelectedIndex, currentIndex);

    setSelectedIds(prev => {
      const newSet = new Set(prev);
      for (let i = start; i <= end; i++) {
        if (items[i]) {
          newSet.add(getId(items[i]));
        }
      }
      return newSet;
    });

    setLastSelectedIndex(currentIndex);
  }, [items, getId, lastSelectedIndex, toggleSelection]);

  // Check if item is selected
  const isSelected = useCallback((item: T) => {
    return selectedIds.has(getId(item));
  }, [selectedIds, getId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A / Cmd+A - Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Only if not in input
        if (!(e.target as HTMLElement).matches('input, textarea, select, [contenteditable]')) {
          e.preventDefault();
          selectAll();
        }
      }

      // Ctrl+D / Cmd+D - Deselect all
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (!(e.target as HTMLElement).matches('input, textarea, select, [contenteditable]')) {
          e.preventDefault();
          deselectAll();
        }
      }

      // Escape - Deselect all
      if (e.key === 'Escape' && selectedIds.size > 0) {
        deselectAll();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, selectAll, deselectAll, selectedIds.size]);

  return {
    selectedIds,
    selectedItems,
    selectedCount,
    isAllSelected,
    isSomeSelected,
    selectAll,
    deselectAll,
    toggleSelection,
    rangeSelection,
    isSelected,
  };
}
