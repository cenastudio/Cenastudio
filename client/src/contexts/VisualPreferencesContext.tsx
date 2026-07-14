import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export interface VisualPreferences {
  themeMode: "dark" | "light" | "auto";
  density: "compact" | "normal" | "spacious";
  fontFamily: "inter" | "system" | "mono";
  reduceAnimations: boolean;
}

type ResolvedTheme = "dark" | "light";
interface VisualPreferencesContextType {
  preferences: VisualPreferences;
  resolvedTheme: ResolvedTheme;
  updatePreference: <K extends keyof VisualPreferences>(key: K, value: VisualPreferences[K]) => Promise<void>;
  isLoading: boolean;
}

const STORAGE_KEY = "frame.visual-preferences";
const defaults: VisualPreferences = { themeMode: "dark", density: "normal", fontFamily: "inter", reduceAnimations: false };
const Context = createContext<VisualPreferencesContextType | undefined>(undefined);

function readCachedPreferences(): VisualPreferences {
  try {
    const cached = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const legacyTheme = localStorage.getItem("theme");
    const themeMode = cached.themeMode ?? (legacyTheme === "light" || legacyTheme === "dark" ? legacyTheme : defaults.themeMode);
    return { ...defaults, ...cached, themeMode };
  } catch { return defaults; }
}

function resolveTheme(mode: VisualPreferences["themeMode"]): ResolvedTheme {
  return mode === "auto" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
}

function applyPreferences(prefs: VisualPreferences) {
  const root = document.documentElement;
  const theme = resolveTheme(prefs.themeMode);
  root.dataset.theme = theme;
  root.dataset.density = prefs.density;
  root.dataset.font = prefs.fontFamily;
  root.dataset.reduceMotion = String(prefs.reduceAnimations);
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  localStorage.setItem("theme", theme);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function VisualPreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<VisualPreferences>(readCachedPreferences);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(readCachedPreferences().themeMode));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    applyPreferences(preferences);
    setResolvedTheme(resolveTheme(preferences.themeMode));
    if (preferences.themeMode !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => { applyPreferences(preferences); setResolvedTheme(resolveTheme("auto")); };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preferences]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setIsLoading(false); return; }
    setIsLoading(true);
    api.auth.getVisualPreferences().then(setPreferences).catch(console.error).finally(() => setIsLoading(false));
  }, [authLoading, isAuthenticated]);

  const value = useMemo<VisualPreferencesContextType>(() => ({
    preferences,
    resolvedTheme,
    isLoading,
    updatePreference: async (key, nextValue) => {
      const previous = preferences;
      const next = { ...previous, [key]: nextValue };
      setPreferences(next);
      try { await api.auth.updateVisualPreferences(next); }
      catch (error) { setPreferences(previous); throw error; }
    },
  }), [preferences, resolvedTheme, isLoading]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOptionalVisualPreferences() { return useContext(Context); }
export function useVisualPreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("useVisualPreferences must be used within VisualPreferencesProvider");
  return value;
}
