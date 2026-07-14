import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

export interface BehaviorPreferences {
  defaultProjectSort: "recent" | "alphabetical" | "deadline";
  defaultView: "grid" | "list";
  autoplayVideos: boolean;
}

interface BehaviorPreferencesContextValue {
  preferences: BehaviorPreferences;
  isLoading: boolean;
  updatePreference: <K extends keyof BehaviorPreferences>(key: K, value: BehaviorPreferences[K]) => Promise<void>;
}

const defaults: BehaviorPreferences = { defaultProjectSort: "recent", defaultView: "grid", autoplayVideos: true };
const Context = createContext<BehaviorPreferencesContextValue | undefined>(undefined);

export function BehaviorPreferencesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState(defaults);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setPreferences(defaults); setIsLoading(false); return; }
    setIsLoading(true);
    api.auth.getBehaviorPreferences().then(setPreferences).catch(console.error).finally(() => setIsLoading(false));
  }, [authLoading, isAuthenticated]);

  const updatePreference = async <K extends keyof BehaviorPreferences>(key: K, value: BehaviorPreferences[K]) => {
    const previous = preferences;
    const next = { ...previous, [key]: value };
    setPreferences(next);
    try { await api.auth.updateBehaviorPreferences(next); }
    catch (error) { setPreferences(previous); throw error; }
  };

  return <Context.Provider value={{ preferences, isLoading, updatePreference }}>{children}</Context.Provider>;
}

export function useBehaviorPreferences() {
  const value = useContext(Context);
  if (!value) throw new Error("useBehaviorPreferences must be used within BehaviorPreferencesProvider");
  return value;
}
