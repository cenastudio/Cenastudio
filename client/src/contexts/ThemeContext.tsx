import React, { createContext, useContext, useEffect, useState } from "react";
import { useOptionalVisualPreferences } from "@/contexts/VisualPreferencesContext";

type Theme = "light" | "dark";
interface ThemeContextType { theme: Theme; toggleTheme?: () => void; switchable: boolean; }
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "light", switchable = false }: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}) {
  const visual = useOptionalVisualPreferences();
  const [fallbackTheme, setFallbackTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem("theme");
    return stored === "light" || stored === "dark" ? stored : defaultTheme;
  });
  const theme = visual?.resolvedTheme ?? fallbackTheme;

  useEffect(() => {
    if (visual) return;
    const root = document.documentElement;
    root.dataset.theme = fallbackTheme;
    root.classList.toggle("dark", fallbackTheme === "dark");
    root.classList.toggle("light", fallbackTheme === "light");
    localStorage.setItem("theme", fallbackTheme);
  }, [fallbackTheme, visual]);

  const toggleTheme = switchable ? () => {
    const next = theme === "dark" ? "light" : "dark";
    if (visual) void visual.updatePreference("themeMode", next).catch((error) => console.error("Failed to save theme", error));
    else setFallbackTheme(next);
  } : undefined;

  return <ThemeContext.Provider value={{ theme, toggleTheme, switchable }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
