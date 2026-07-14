import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";

interface VisualPreferences {
  themeMode: "dark" | "light" | "auto";
  density: "compact" | "normal" | "spacious";
  fontFamily: "inter" | "system" | "mono";
  reduceAnimations: boolean;
}

interface VisualPreferencesContextType {
  preferences: VisualPreferences;
  updatePreference: <K extends keyof VisualPreferences>(key: K, value: VisualPreferences[K]) => Promise<void>;
  isLoading: boolean;
}

const defaultPreferences: VisualPreferences = {
  themeMode: "dark",
  density: "normal",
  fontFamily: "inter",
  reduceAnimations: false,
};

const VisualPreferencesContext = createContext<VisualPreferencesContextType>({
  preferences: defaultPreferences,
  updatePreference: async () => {},
  isLoading: true,
});

export function VisualPreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<VisualPreferences>(defaultPreferences);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar preferências ao montar
  useEffect(() => {
    api.auth.getVisualPreferences()
      .then((prefs) => {
        setPreferences(prefs);
        applyPreferences(prefs);
      })
      .catch((err) => {
        console.error("Erro ao carregar preferências visuais:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Aplicar preferências no DOM
  const applyPreferences = (prefs: VisualPreferences) => {
    const root = document.documentElement;

    // Tema
    if (prefs.themeMode === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      root.classList.toggle("light", !prefersDark);
    } else {
      root.classList.toggle("dark", prefs.themeMode === "dark");
      root.classList.toggle("light", prefs.themeMode === "light");
    }

    // Densidade
    root.setAttribute("data-density", prefs.density);

    // Fonte
    root.setAttribute("data-font", prefs.fontFamily);

    // Animações
    if (prefs.reduceAnimations) {
      root.style.setProperty("--animation-duration", "0.01s");
    } else {
      root.style.removeProperty("--animation-duration");
    }
  };

  const updatePreference = async <K extends keyof VisualPreferences>(
    key: K,
    value: VisualPreferences[K]
  ) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    applyPreferences(newPrefs);

    // Salvar no backend
    try {
      await api.auth.updateVisualPreferences(newPrefs);
    } catch (err) {
      console.error("Erro ao salvar preferências:", err);
      // Reverter em caso de erro
      setPreferences(preferences);
      applyPreferences(preferences);
    }
  };

  return (
    <VisualPreferencesContext.Provider value={{ preferences, updatePreference, isLoading }}>
      {children}
    </VisualPreferencesContext.Provider>
  );
}

export function useVisualPreferences() {
  const context = useContext(VisualPreferencesContext);
  if (!context) {
    throw new Error("useVisualPreferences must be used within VisualPreferencesProvider");
  }
  return context;
}
