"use client";
import Image from "next/image";
import { useMemo } from "react";
import { useThemeCustomizer } from "@/context/ThemeCustomizerContext";
import { useThemeProfile, PROFILE_THEMES } from "@/context/ThemeProfileContext";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/data/navbar-translate.json";
import type { ThemeProfile } from "@/context/ThemeProfileContext";

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";
type TranslationEntry = Partial<Record<Lang, string>>;
type TranslationMap = Record<string, TranslationEntry>;
const typedTranslations: TranslationMap = translations;

const PROFILE_ICONS: Record<Exclude<ThemeProfile, "default">, string> = {
  hacker: "💻",
  developer: "⌨️",
  user: "😊",
};

const PROFILE_NAME_KEYS: Record<ThemeProfile, string> = {
  default: "DefaultProfile",
  hacker: "HackerProfile",
  developer: "DeveloperProfile",
  user: "UserProfile",
};

const PROFILE_DESC_KEYS: Record<ThemeProfile, string> = {
  default: "DefaultProfileDesc",
  hacker: "HackerProfileDesc",
  developer: "DeveloperProfileDesc",
  user: "UserProfileDesc",
};

const PALETTE_NAME_KEYS: Record<string, string> = {
  "Fire": "FirePalette",
  "Cyber Neon": "CyberNeonPalette",
  "Matrix Green": "MatrixGreenPalette",
  "Sunset": "SunsetPalette",
  "Ocean": "OceanPalette",
  "Royal Purple": "RoyalPurplePalette",
  "Forest": "ForestPalette",
  "Midnight": "MidnightPalette",
  "Cherry Blossom": "CherryBlossomPalette",
  "Tropical": "TropicalPalette",
  "Retro Wave": "RetroWavePalette",
};

export default function ThemeCustomizer() {
  const { customTheme, isCustomizing, setCustomTheme, toggleCustomizer, resetTheme, presetPalettes, applyPalette, highContrast, toggleHighContrast, reducedMotion, toggleReducedMotion, designSystem, setDesignSystem } = useThemeCustomizer();
  const { profile, setProfile } = useThemeProfile();
  const { language } = useLanguage();
  const t = useMemo(() => {
    const lang = language as Lang;
    return (key: string) => typedTranslations[key]?.[lang] ?? key;
  }, [language]);

  return (
    <>
      <button
        style={{
          position: "fixed",
          bottom: "80px",
          left: "16px",
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          border: "1px solid var(--neon-purple, #b300ff)",
          background: "transparent",
          color: "var(--neon-purple, #b300ff)",
          cursor: "pointer",
          zIndex: "var(--z-customizer)",
          fontSize: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 10px rgba(179,0,255,0.3)"
        }}
        onClick={toggleCustomizer}
        title={t("CustomizeTheme")}
      >
        🎨
      </button>

      {isCustomizing && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            width: "320px",
            maxWidth: "90vw",
            background: "var(--v2-panel, rgba(10,10,15,0.98))",
            borderRight: "1px solid var(--border-neon, rgba(0,212,255,0.3))",
            zIndex: "var(--z-customizer)",
            padding: "24px",
            overflowY: "auto",
            boxShadow: "4px 0 30px rgba(0,0,0,0.5)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ fontWeight: "bold", fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
              {t("ThemeCustomizer")}
            </p>
            <button
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "4px",
                border: "none",
                background: "transparent",
                color: "var(--neon-pink, #A020F0)",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onClick={toggleCustomizer}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", margin: "0 0 10px 0", opacity: 0.7, letterSpacing: "0.08em" }}>
              {t("DesignSystem") || "UI System"}
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["modern", "classic"] as const).map((ds) => {
                const isActive = designSystem === ds;
                return (
                  <button
                    key={ds}
                    onClick={() => setDesignSystem(ds)}
                    style={{
                      flex: 1,
                      padding: "10px 8px",
                      border: isActive ? "2px solid var(--accent, #00d4ff)" : "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      background: isActive ? "rgba(0,212,255,0.12)" : "rgba(255,255,255,0.03)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "11px",
                      transition: "all 0.2s ease",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: "16px" }}>{ds === "modern" ? "🎨" : "📜"}</span>
                    <div style={{ fontWeight: 600, fontSize: "12px", marginTop: "4px" }}>
                      {ds === "modern" ? (t("Modern") || "Modern") : (t("Classic") || "Classic")}
                    </div>
                    <div style={{ fontSize: "9px", opacity: 0.6, marginTop: "2px" }}>
                      {ds === "modern" ? (t("ModernDesc") || "5.0 UI") : (t("ClassicDesc") || "4.0 UI")}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", margin: "0 0 10px 0", opacity: 0.7, letterSpacing: "0.08em" }}>
              {t("Profile")}
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {(["default", "hacker", "developer", "user"] as ThemeProfile[]).map((p) => {
                const isActive = profile === p;
                const pt = PROFILE_THEMES[p];
                return (
                  <button
                    key={p}
                    onClick={() => setProfile(p)}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "4px",
                      padding: "10px 6px",
                      border: isActive ? `2px solid ${pt.accentColor}` : "1px solid rgba(255,255,255,0.12)",
                      borderRadius: "12px",
                      background: isActive ? `linear-gradient(135deg, ${pt.backgroundColor}, rgba(0,0,0,0.6))` : "rgba(255,255,255,0.03)",
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: "11px",
                      transition: "all 0.2s ease",
                      boxShadow: isActive ? `0 0 12px ${pt.accentColor}44` : "none",
                    }}
                  >
                    {p === "default" ? (
                      <Image src="/elitetech.png" alt="Default" width={20} height={20} style={{ objectFit: "contain" }} />
                    ) : (
                      <span style={{ fontSize: "20px" }}>{PROFILE_ICONS[p]}</span>
                    )}
                    <span style={{ fontWeight: 600, fontSize: "12px" }}>{t(PROFILE_NAME_KEYS[p])}</span>
                    <span style={{ fontSize: "9px", opacity: 0.6, lineHeight: 1.2 }}>{t(PROFILE_DESC_KEYS[p])}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
            <button
              onClick={toggleHighContrast}
              style={{
                flex: 1, padding: "8px 16px", cursor: "pointer", fontSize: "13px",
                border: `1px solid ${highContrast ? "#ffd700" : "#888"}`,
                borderRadius: "8px",
                background: highContrast ? "rgba(255,215,0,0.15)" : "transparent",
                color: highContrast ? "#ffd700" : "#888",
              }}
              aria-pressed={highContrast}
            >
              {highContrast ? `☀️ ${t("HighContrastOn")}` : `☁️ ${t("HighContrast")}`}
            </button>
            <button
              onClick={toggleReducedMotion}
              style={{
                flex: 1, padding: "8px 16px", cursor: "pointer", fontSize: "13px",
                border: `1px solid ${reducedMotion ? "#48bb78" : "#888"}`,
                borderRadius: "8px",
                background: reducedMotion ? "rgba(72,187,120,0.15)" : "transparent",
                color: reducedMotion ? "#48bb78" : "#888",
              }}
              aria-pressed={reducedMotion}
            >
              {reducedMotion ? `🐢 ${t("ReducedMotion")}` : `⚡ ${t("AnimationsOn")}`}
            </button>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", margin: "0 0 8px 0", opacity: 0.7 }}>
              {t("PresetPalettes")}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {Object.entries(presetPalettes).map(([name, palette]) => (
                <button
                  key={name}
                  className="neon-lava"
                  style={{
                    fontSize: "13px",
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    border: "none",
                    background: `linear-gradient(135deg, ${palette.accentColor}, ${palette.primaryColor}, ${palette.secondaryColor}, ${palette.primaryColor}, ${palette.accentColor})`,
                    backgroundSize: "300% 300%",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontFamily: "var(--sans, system-ui)",
                    letterSpacing: "0.03em",
                    boxShadow: `0 0 8px ${palette.accentColor}99, 0 0 16px ${palette.accentColor}66`,
                    animation: "lava-flow 3s ease infinite !important",
                    "--btn-shimmer": palette.accentColor,
                  } as React.CSSProperties}
                  onClick={() => applyPalette(name)}
                >
                  {PALETTE_NAME_KEYS[name] ? t(PALETTE_NAME_KEYS[name]) : name}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", margin: "0 0 8px 0", opacity: 0.7 }}>
              {t("Colors")}
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              {([[t("Primary"), "primaryColor"], [t("Secondary"), "secondaryColor"], [t("Accent"), "accentColor"], [t("BackgroundColor"), "backgroundColor"], [t("TextColor"), "textColor"]] as const).map(([label, key]) => {
                const k = key as keyof typeof customTheme;
                return (
                  <div key={key} style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
                    <input type="color" value={customTheme[k] as string} onChange={(e) => setCustomTheme({ [k]: e.target.value })}
                      style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid rgba(0,212,255,0.3)", cursor: "pointer", background: customTheme[k] as string, padding: 0 }}
                    />
                    <p style={{ fontSize: "12px", opacity: 0.6, margin: 0 }}>{label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", margin: "0 0 8px 0", opacity: 0.7 }}>
              {t("GlowIntensity")}
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {([["low", t("Low")], ["medium", t("Medium")], ["high", t("High")]] as const).map(([value, label]) => (
                <button key={value}
                  style={{
                    flex: 1,
                    fontSize: "14px",
                    padding: "8px",
                    border: "1px solid var(--accent, #00d4ff)",
                    borderRadius: "8px",
                    background: customTheme.glowIntensity === value ? "var(--accent, #00d4ff)" : "transparent",
                    color: customTheme.glowIntensity === value ? "#000" : "var(--accent, #00d4ff)",
                    cursor: "pointer"
                  }}
                  onClick={() => setCustomTheme({ glowIntensity: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", margin: "0 0 8px 0", opacity: 0.7 }}>
              {t("BorderRadius")}
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              {([["square", t("Square")], ["rounded", t("Rounded")], ["pill", t("Pill")]] as const).map(([value, label]) => (
                <button key={value}
                  style={{
                    flex: 1,
                    fontSize: "14px",
                    padding: "8px",
                    border: "1px solid var(--accent, #00d4ff)",
                    borderRadius: value === "square" ? "4px" : value === "pill" ? "9999px" : "8px",
                    background: customTheme.borderRadius === value ? "var(--accent, #00d4ff)" : "transparent",
                    color: customTheme.borderRadius === value ? "#000" : "var(--accent, #00d4ff)",
                    cursor: "pointer"
                  }}
                  onClick={() => setCustomTheme({ borderRadius: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            padding: "16px",
            border: "1px solid #90cdf4",
            borderRadius: customTheme.borderRadius === "square" ? "4px" : customTheme.borderRadius === "pill" ? "9999px" : "8px",
            textAlign: "center",
            marginBottom: "16px",
            background: customTheme.backgroundColor,
            color: customTheme.textColor
          }}>
            <p style={{ color: customTheme.primaryColor, fontWeight: 600, fontSize: "14px", margin: 0 }}>
              {t("Preview")}
            </p>
            <p style={{ fontSize: "12px", opacity: 0.8, margin: 0 }}>
              {t("CustomThemePreview")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: customTheme.primaryColor }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: customTheme.secondaryColor }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: customTheme.accentColor }} />
            </div>
          </div>

          <button
            style={{
              width: "100%",
              padding: "8px 16px",
              border: "1px solid var(--neon-pink, #A020F0)",
              borderRadius: "8px",
              background: "transparent",
              color: "var(--neon-pink, #A020F0)",
              cursor: "pointer",
              fontSize: "14px"
            }}
            onClick={resetTheme}
          >
            {t("ResetToDefault")}
          </button>
        </div>
      )}
    </>
  );
}
