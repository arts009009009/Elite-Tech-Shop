"use client";
import { createContext, useState, useCallback, useEffect, useContext, useMemo } from "react";
import type { ReactNode } from "react";

export type DesignSystem = "modern" | "classic";
export type CustomTheme = { primaryColor: string; secondaryColor: string; accentColor: string; backgroundColor: string; textColor: string; glowIntensity: "low" | "medium" | "high"; borderRadius: "square" | "rounded" | "pill" };
type UserSavedTheme = { name: string; theme: CustomTheme; createdAt: number };
type ThemeCustomizerState = {
  customTheme: CustomTheme; isCustomizing: boolean; setCustomTheme: (theme: Partial<CustomTheme>) => void;
  toggleCustomizer: () => void; resetTheme: () => void; currentPalette: string;
  presetPalettes: Record<string, CustomTheme>; applyPalette: (name: string) => void;
  userThemes: UserSavedTheme[]; saveUserTheme: (name: string) => void; deleteUserTheme: (name: string) => void;
  importTheme: (themeJson: string) => boolean; exportCurrentTheme: () => string;
  animateTheme: boolean; toggleThemeAnimation: () => void;
  highContrast: boolean; toggleHighContrast: () => void; reducedMotion: boolean; toggleReducedMotion: () => void;
  designSystem: DesignSystem; setDesignSystem: (ds: DesignSystem) => void;
};

export const ThemeCustomizerContext = createContext<ThemeCustomizerState | null>(null);

const THEME_VERSION = 4;
export const DEFAULT_THEME: CustomTheme = { primaryColor: "#b300ff", secondaryColor: "#00d4ff", accentColor: "#aa3bff", backgroundColor: "#0a0a0f", textColor: "#8443c2", glowIntensity: "medium", borderRadius: "rounded" };

function themesEqual(a: CustomTheme, b: CustomTheme): boolean {
  return a.primaryColor === b.primaryColor && a.secondaryColor === b.secondaryColor && a.accentColor === b.accentColor && a.backgroundColor === b.backgroundColor && a.textColor === b.textColor && a.glowIntensity === b.glowIntensity && a.borderRadius === b.borderRadius;
}

const PRESET_PALETTES: Record<string, CustomTheme> = {
  "Fire": { primaryColor: "#ff4500", secondaryColor: "#ffd700", accentColor: "#ff6600", backgroundColor: "#1a0500", textColor: "#ffe0cc", glowIntensity: "high", borderRadius: "rounded" },
  "Cyber Neon": { primaryColor: "#b300ff", secondaryColor: "#00d4ff", accentColor: "#aa3bff", backgroundColor: "#0a0a0f", textColor: "#e0e0e0", glowIntensity: "high", borderRadius: "rounded" },
  "Matrix Green": { primaryColor: "#00ff41", secondaryColor: "#00cc33", accentColor: "#009900", backgroundColor: "#000000", textColor: "#00ff41", glowIntensity: "medium", borderRadius: "square" },
  "Sunset": { primaryColor: "#ff6b35", secondaryColor: "#f7c59f", accentColor: "#ff3366", backgroundColor: "#1a0a00", textColor: "#ffe0cc", glowIntensity: "medium", borderRadius: "pill" },
  "Ocean": { primaryColor: "#0066ff", secondaryColor: "#00ccff", accentColor: "#0033aa", backgroundColor: "#000d1a", textColor: "#ccf2ff", glowIntensity: "low", borderRadius: "rounded" },
  "Royal Purple": { primaryColor: "#9b59b6", secondaryColor: "#e74c3c", accentColor: "#8e44ad", backgroundColor: "#0a001a", textColor: "#f0e6ff", glowIntensity: "high", borderRadius: "rounded" },
  "Forest": { primaryColor: "#2ecc71", secondaryColor: "#f39c12", accentColor: "#1a8a3a", backgroundColor: "#0a140a", textColor: "#d5f5e3", glowIntensity: "medium", borderRadius: "rounded" },
  "Midnight": { primaryColor: "#4a6cf7", secondaryColor: "#6c63ff", accentColor: "#2a3db7", backgroundColor: "#050510", textColor: "#c8d6e5", glowIntensity: "low", borderRadius: "square" },
  "Cherry Blossom": { primaryColor: "#ff6b9d", secondaryColor: "#c44569", accentColor: "#f8a5c2", backgroundColor: "#1a0a12", textColor: "#fce4ec", glowIntensity: "high", borderRadius: "pill" },
  "Tropical": { primaryColor: "#00b894", secondaryColor: "#fdcb6e", accentColor: "#e17055", backgroundColor: "#001510", textColor: "#dfe6e9", glowIntensity: "medium", borderRadius: "rounded" },
  "Retro Wave": { primaryColor: "#fe01b1", secondaryColor: "#00ffff", accentColor: "#ff00cc", backgroundColor: "#0a0015", textColor: "#f0e6ff", glowIntensity: "high", borderRadius: "rounded" },
};

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ThemeCustomizerProvider({ children }: { children: ReactNode }) {
  const [customTheme, setCustomThemeState] = useState<CustomTheme>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("custom_theme") || "null");
      if (stored && stored._version === THEME_VERSION) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _version, ...theme } = stored;
        return theme;
      }
      return DEFAULT_THEME;
    }
    catch { return DEFAULT_THEME; }
  });
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [currentPalette, setCurrentPalette] = useState("Custom");
  const [userThemes, setUserThemes] = useState<UserSavedTheme[]>(() => {
    try { return JSON.parse(localStorage.getItem("user_themes") || "[]"); }
    catch { return []; }
  });
  const [animateTheme, setAnimateTheme] = useState(() => { try { const v = localStorage.getItem("theme_animation"); return v === null ? true : v === "true"; } catch { return true; } });
  const [highContrast, setHighContrast] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        return localStorage.getItem("elite_high_contrast") === "true" || window.matchMedia("(prefers-contrast: more)").matches;
      }
    } catch {}
    return false;
  });
  const [reducedMotion, setReducedMotion] = useState(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem("elite_reduced_motion") === "true";
        if (stored) document.body.classList.add("reduced-motion");
        return stored;
      }
    } catch {}
    return false;
  });
  const [designSystem, setDesignSystemState] = useState<DesignSystem>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("elite_design_system");
        if (saved === "classic" || saved === "modern") return saved;
      }
    } catch {}
    return "modern";
  });

  useEffect(() => {
    document.body.classList.toggle("high-contrast", highContrast);
    try { localStorage.setItem("elite_high_contrast", String(highContrast)); } catch {}
  }, [highContrast]);

  useEffect(() => {
    try { localStorage.setItem("elite_reduced_motion", String(reducedMotion)); } catch {}
    document.body.classList.toggle("reduced-motion", reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    try { localStorage.setItem("elite_design_system", designSystem); } catch {}
    document.body.classList.toggle("design-system-classic", designSystem === "classic");
  }, [designSystem]);

  useEffect(() => {
    try { localStorage.setItem("custom_theme", JSON.stringify({ ...customTheme, _version: THEME_VERSION })); } catch {}
    const root = document.documentElement;
    const isDefault = themesEqual(customTheme, DEFAULT_THEME);
    const set = (key: string, val: string) => root.style.setProperty(key, val);
    const t = isDefault ? DEFAULT_THEME : customTheme;
    set("--custom-primary", t.primaryColor);
    set("--custom-secondary", t.secondaryColor);
    set("--custom-accent", t.accentColor);
    set("--custom-bg", t.backgroundColor);
    set("--custom-text", t.textColor);
    set("--custom-border", hexToRgba(t.accentColor, 0.3));
    set("--custom-bg-card", hexToRgba(t.backgroundColor, 0.85));
    const glowSize = t.glowIntensity === "high" ? "0 0 10px 0 0 20px 0 0 40px" : t.glowIntensity === "medium" ? "0 0 8px 0 0 16px" : "0 0 4px";
    const makeGlow = (color: string, size: string) => {
      const parts = size.match(/\d+/g);
      if (!parts) return `0 0 4px ${color}`;
      return parts.map((n) => `0 0 ${n}px ${color}`).join(", ");
    };
    set("--custom-glow-pink", makeGlow(t.secondaryColor, glowSize));
    set("--custom-glow-blue", makeGlow(t.primaryColor, glowSize));
    set("--custom-glow-opacity", t.glowIntensity === "high" ? "1" : t.glowIntensity === "medium" ? "0.6" : "0.25");
    set("--custom-radius", t.borderRadius === "square" ? "4px" : t.borderRadius === "pill" ? "9999px" : "12px");
    if (animateTheme) {
      set("--theme-animate-speed", "3s");
    } else {
      root.style.removeProperty("--theme-animate-speed");
    }
  }, [customTheme, animateTheme]);

  const setCustomTheme = useCallback((partial: Partial<CustomTheme>) => {
    setCustomThemeState((prev) => {
      const updated = { ...prev, ...partial };
      for (const [name, palette] of Object.entries(PRESET_PALETTES)) {
        if (themesEqual(updated, palette)) { setCurrentPalette(name); return updated; }
      }
      setCurrentPalette("Custom"); return updated;
    });
  }, []);

  const toggleCustomizer = useCallback(() => setIsCustomizing((prev) => !prev), []);
  const resetTheme = useCallback(() => { setCustomThemeState(DEFAULT_THEME); setCurrentPalette("Custom"); }, []);
  const applyPalette = useCallback((name: string) => { const palette = PRESET_PALETTES[name]; if (palette) { setCustomThemeState(palette); setCurrentPalette(name); } }, []);

  const saveUserTheme = useCallback((name: string) => {
    setUserThemes((prev) => {
      const filtered = prev.filter((t) => t.name !== name);
      const updated = [...filtered, { name, theme: { ...customTheme }, createdAt: Date.now() }];
      try { localStorage.setItem("user_themes", JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, [customTheme]);

  const deleteUserTheme = useCallback((name: string) => {
    setUserThemes((prev) => { const updated = prev.filter((t) => t.name !== name); try { localStorage.setItem("user_themes", JSON.stringify(updated)); } catch {} return updated; });
  }, []);

  const importTheme = useCallback((themeJson: string): boolean => {
    try {
      const parsed = JSON.parse(themeJson) as CustomTheme;
      const required: (keyof CustomTheme)[] = ["primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor", "glowIntensity", "borderRadius"];
      for (const key of required) { if (!(key in parsed)) return false; }
      if (!["low", "medium", "high"].includes(parsed.glowIntensity)) return false;
      if (!["square", "rounded", "pill"].includes(parsed.borderRadius)) return false;
      setCustomThemeState(parsed); setCurrentPalette("Custom"); return true;
    } catch { return false; }
  }, []);

  const exportCurrentTheme = useCallback(() => JSON.stringify(customTheme, null, 2), [customTheme]);
  const toggleThemeAnimation = useCallback(() => { setAnimateTheme((prev) => { const next = !prev; try { localStorage.setItem("theme_animation", String(next)); } catch {} return next; }); }, []);
  const toggleHighContrast = useCallback(() => setHighContrast((prev) => !prev), []);
  const toggleReducedMotion = useCallback(() => setReducedMotion((prev) => !prev), []);
  const setDesignSystem = useCallback((ds: DesignSystem) => setDesignSystemState(ds), []);

  return (
    <ThemeCustomizerContext.Provider value={useMemo(() => ({ customTheme, isCustomizing, setCustomTheme, toggleCustomizer, resetTheme, currentPalette, presetPalettes: PRESET_PALETTES, applyPalette, userThemes, saveUserTheme, deleteUserTheme, importTheme, exportCurrentTheme, animateTheme, toggleThemeAnimation, highContrast, toggleHighContrast, reducedMotion, toggleReducedMotion, designSystem, setDesignSystem }), [customTheme, isCustomizing, setCustomTheme, toggleCustomizer, resetTheme, currentPalette, applyPalette, userThemes, saveUserTheme, deleteUserTheme, importTheme, exportCurrentTheme, animateTheme, toggleThemeAnimation, highContrast, toggleHighContrast, reducedMotion, toggleReducedMotion, designSystem, setDesignSystem])}>
      {children}
    </ThemeCustomizerContext.Provider>
  );
}

export function useThemeCustomizer() {
  const ctx = useContext(ThemeCustomizerContext);
  if (!ctx) throw new Error("useThemeCustomizer must be used within ThemeCustomizerProvider");
  return ctx;
}
