"use client";
import { useEffect } from "react";
import { useThemeCustomizer } from "@/context/ThemeCustomizerContext";
import { useThemeMode } from "@/context/ThemeModeContext";

export default function DesignSystemSync() {
  const { designSystem } = useThemeCustomizer();
  const { theme } = useThemeMode();
  useEffect(() => {
    document.body.classList.toggle("design-system-classic", designSystem === "classic");
    const wp = designSystem === "classic" ? "/classic wallpaper.png" : "/wallpaper.png";
    if (theme === "light-mode") {
      document.body.style.background = `url("${wp}") no-repeat center center fixed`;
      document.body.style.backgroundSize = "cover";
    } else if (theme === "cyberpunk-mode") {
      document.body.style.background = "#000000";
      document.body.style.backgroundImage = "none";
    } else {
      document.body.style.background = `url("${wp}") no-repeat center center fixed`;
      document.body.style.backgroundSize = "cover";
    }
  }, [designSystem, theme]);
  return null;
}
