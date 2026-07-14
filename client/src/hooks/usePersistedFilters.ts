/**
 * usePersistedFilters - Hook para filtros que persistem entre navegações
 *
 * Salva filtros em URL params E localStorage para melhor UX
 * - URL params: shareable, refresh-safe
 * - localStorage: fallback quando URL não tem params
 */

import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";

export interface PersistedFiltersOptions<T> {
  storageKey: string; // Key for localStorage
  defaultFilters: T;
  syncWithUrl?: boolean; // Default: true
}

export function usePersistedFilters<T extends Record<string, string | number | boolean>>({
  storageKey,
  defaultFilters,
  syncWithUrl = true
}: PersistedFiltersOptions<T>) {
  const [location, setLocation] = useLocation();
  const searchParams = useSearch();

  // Initialize filters from URL or localStorage
  const [filters, setFiltersState] = useState<T>(() => {
    if (syncWithUrl && searchParams) {
      // Try URL params first
      const params = new URLSearchParams(searchParams);
      const fromUrl: Partial<T> = {};
      let hasUrlParams = false;

      Object.keys(defaultFilters).forEach((key) => {
        const value = params.get(key);
        if (value !== null) {
          hasUrlParams = true;
          // Parse value based on default type
          const defaultValue = defaultFilters[key as keyof T];
          if (typeof defaultValue === "boolean") {
            fromUrl[key as keyof T] = (value === "true") as T[keyof T];
          } else if (typeof defaultValue === "number") {
            fromUrl[key as keyof T] = Number(value) as T[keyof T];
          } else {
            fromUrl[key as keyof T] = value as T[keyof T];
          }
        }
      });

      if (hasUrlParams) {
        return { ...defaultFilters, ...fromUrl };
      }
    }

    // Fallback to localStorage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaultFilters, ...parsed };
      }
    } catch {
      // Ignore parse errors
    }

    return defaultFilters;
  });

  // Update URL params when filters change
  useEffect(() => {
    if (!syncWithUrl) return;

    const params = new URLSearchParams();
    let hasNonDefaultFilter = false;

    Object.entries(filters).forEach(([key, value]) => {
      // Only add to URL if different from default
      if (value !== defaultFilters[key as keyof T]) {
        params.set(key, String(value));
        hasNonDefaultFilter = true;
      }
    });

    // Update URL without navigation
    const newSearch = hasNonDefaultFilter ? `?${params.toString()}` : "";
    const currentPath = location.split("?")[0];
    const newPath = `${currentPath}${newSearch}`;

    if (location !== newPath) {
      // Use replaceState to avoid adding to history
      window.history.replaceState({}, "", newPath);
    }
  }, [filters, syncWithUrl, location, defaultFilters, storageKey]);

  // Save to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch {
      // Ignore storage errors
    }
  }, [filters, storageKey]);

  // Set filters (merges with current)
  const setFilters = useCallback((updates: Partial<T> | ((prev: T) => Partial<T>)) => {
    setFiltersState(prev => {
      const newFilters = typeof updates === "function" ? updates(prev) : updates;
      return { ...prev, ...newFilters };
    });
  }, []);

  // Reset to defaults
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, [defaultFilters]);

  // Check if filters are default
  const isDefault = useCallback(() => {
    return Object.keys(filters).every(
      key => filters[key as keyof T] === defaultFilters[key as keyof T]
    );
  }, [filters, defaultFilters]);

  // Get single filter value
  const getFilter = useCallback(<K extends keyof T>(key: K): T[K] => {
    return filters[key];
  }, [filters]);

  // Set single filter value
  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setFilters({ [key]: value } as unknown as Partial<T>);
  }, [setFilters]);

  return {
    filters,
    setFilters,
    setFilter,
    getFilter,
    resetFilters,
    isDefault: isDefault(),
  };
}
