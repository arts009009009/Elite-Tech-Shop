"use client";
import { createContext, useState, useCallback, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";

export type ThemeMode = "light-mode" | "dark-mode" | "cyberpunk-mode";

type ThemeModeState = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  cycleTheme: () => void;
};

const ThemeModeContext = createContext<ThemeModeState | null>(null);

const THEME_KEY = "elite_theme_mode";
const THEME_OPTIONS: ThemeMode[] = ["light-mode", "dark-mode", "cyberpunk-mode"];

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark-mode");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved && (THEME_OPTIONS as string[]).includes(saved)) {
        setThemeState(saved as ThemeMode);
        return;
      }
    } catch {}
    const system = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark-mode" : "light-mode";
    setThemeState(system);
  }, []);

  useEffect(() => {
    const preserved = ["hacker", "developer", "user", "design-system-classic", "high-contrast", "reduced-motion"];
    document.body.className = [
      ...preserved.filter((c) => document.body.classList.contains(c)),
      theme,
    ].join(" ");
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => setThemeState(t), []);
  const cycleTheme = useCallback(() => {
    setThemeState((prev) => {
      const idx = THEME_OPTIONS.indexOf(prev);
      return THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length];
    });
  }, []);

  return (
    <ThemeModeContext.Provider value={useMemo(() => ({ theme, setTheme, cycleTheme }), [theme, setTheme, cycleTheme])}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) return { theme: "light-mode" as ThemeMode, setTheme: () => {}, cycleTheme: () => {} };
  return ctx;
}
