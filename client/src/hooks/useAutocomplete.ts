/**
 * useAutocomplete - Hook para autocompletar campos com histórico
 *
 * Mantém histórico de valores únicos digitados e sugere ao digitar
 */

import { useState, useEffect, useCallback } from "react";

interface AutocompleteOptions {
  storageKey: string; // chave do localStorage
  maxSuggestions?: number; // máximo de sugestões (default: 10)
  minChars?: number; // mínimo de caracteres para sugerir (default: 2)
}

export function useAutocomplete(options: AutocompleteOptions) {
  const { storageKey, maxSuggestions = 10, minChars = 2 } = options;
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(Array.isArray(parsed) ? parsed.slice(0, maxSuggestions) : []);
      }
    } catch {
      // ignore parse errors
    }
  }, [storageKey, maxSuggestions]);

  // Save to history
  const saveToHistory = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed || trimmed.length < minChars) return;

      setHistory((prev) => {
        // Remove duplicates and add to front
        const filtered = prev.filter((item) => item !== trimmed);
        const newHistory = [trimmed, ...filtered].slice(0, maxSuggestions);

        // Persist to localStorage
        try {
          localStorage.setItem(storageKey, JSON.stringify(newHistory));
        } catch {
          // ignore storage errors
        }

        return newHistory;
      });
    },
    [storageKey, maxSuggestions, minChars]
  );

  // Get suggestions based on current input
  const getSuggestions = useCallback(
    (input: string) => {
      const trimmed = input.trim().toLowerCase();

      if (trimmed.length < minChars) {
        setSuggestions([]);
        return;
      }

      const filtered = history
        .filter((item) => item.toLowerCase().includes(trimmed))
        .slice(0, maxSuggestions);

      setSuggestions(filtered);
    },
    [history, maxSuggestions, minChars]
  );

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    history,
    suggestions,
    getSuggestions,
    clearSuggestions,
    saveToHistory,
    clearHistory,
  };
}
