"use client";
import { createContext, useState, useCallback, useEffect, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { CustomTheme } from "./ThemeCustomizerContext";
import { useThemeCustomizer, DEFAULT_THEME } from "./ThemeCustomizerContext";

export type ThemeProfile = "default" | "hacker" | "developer" | "user";

type ThemeProfileState = {
  profile: ThemeProfile;
  setProfile: (p: ThemeProfile) => void;
};

const ThemeProfileContext = createContext<ThemeProfileState | null>(null);

const PROFILE_KEY = "elite_theme_profile";

export const PROFILE_THEMES: Record<ThemeProfile, CustomTheme> = {
  default: DEFAULT_THEME,
  hacker: {
    primaryColor: "#00ff41",
    secondaryColor: "#ffb000",
    accentColor: "#00cc33",
    backgroundColor: "#0a0a0a",
    textColor: "#00ff41",
    glowIntensity: "high",
    borderRadius: "square",
  },
  developer: {
    primaryColor: "#569cd6",
    secondaryColor: "#ce9178",
    accentColor: "#c586c0",
    backgroundColor: "#1e1e1e",
    textColor: "#d4d4d4",
    glowIntensity: "low",
    borderRadius: "square",
  },
  user: {
    primaryColor: "#6c5ce7",
    secondaryColor: "#fd79a8",
    accentColor: "#a29bfe",
    backgroundColor: "#0f0a1a",
    textColor: "#f0e6ff",
    glowIntensity: "medium",
    borderRadius: "pill",
  },
};

const PROFILE_LABELS: Record<ThemeProfile, string> = {
  default: "Default",
  hacker: "Hacker",
  developer: "Developer",
  user: "User",
};

export function ThemeProfileProvider({ children }: { children: ReactNode }) {
  const { setCustomTheme } = useThemeCustomizer();
  const [profile, setProfileState] = useState<ThemeProfile>(() => {
    try {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(PROFILE_KEY) as ThemeProfile | null;
        if (saved && ["default", "hacker", "developer", "user"].includes(saved)) return saved;
      }
    } catch {}
    return "default";
  });

  useEffect(() => {
    document.body.classList.remove("hacker", "developer", "user");
    if (profile !== "default") {
      document.body.classList.add(profile);
    }
    try { localStorage.setItem(PROFILE_KEY, profile); } catch {}
  }, [profile]);

  const setProfile = useCallback((p: ThemeProfile) => {
    setProfileState(p);
    setCustomTheme(PROFILE_THEMES[p]);
  }, [setCustomTheme]);

  return (
    <ThemeProfileContext.Provider value={useMemo(() => ({ profile, setProfile }), [profile, setProfile])}>
      {children}
    </ThemeProfileContext.Provider>
  );
}

export function useThemeProfile() {
  const ctx = useContext(ThemeProfileContext);
  if (!ctx) return { profile: "default" as ThemeProfile, setProfile: () => {} };
  return ctx;
}

export { PROFILE_LABELS };
