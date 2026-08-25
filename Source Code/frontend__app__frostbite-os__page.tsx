"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/data/navbar-translate.json";

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";
type TranslationEntry = Partial<Record<Lang, string>>;
type TranslationMap = Record<string, TranslationEntry>;
const typedTranslations: TranslationMap = translations;

export default function FrostbiteOSPage() {
  const { language } = useLanguage();
  const t = useMemo(() => {
    const lang = language as Lang;
    return (key: string) => typedTranslations[key]?.[lang] ?? key;
  }, [language]);

  const APPS = useMemo(() => [
    { name: "Word", descKey: "RichTextEditor", icon: "📄", href: "/frostbite-os/word", category: "MS Office" },
    { name: "Excel", descKey: "Spreadsheet", icon: "📊", href: "/frostbite-os/excel", category: "MS Office" },
    { name: "PowerPoint", descKey: "SlideEditor", icon: "📽️", href: "/frostbite-os/powerpoint", category: "MS Office" },
    { name: "Notepad", descKey: "SimpleTextEditor", icon: "📝", href: "/frostbite-os/notepad", category: "Bundleware" },
    { name: "Calculator", descKey: "BasicCalculator", icon: "🧮", href: "/frostbite-os/calculator", category: "Bundleware" },
    { name: "Paint", descKey: "DrawingCanvas", icon: "🎨", href: "/frostbite-os/paint", category: "Bundleware" },
    { name: "Clock", descKey: "DigitalClock", icon: "🕐", href: "/frostbite-os/clock", category: "Bundleware" },
    { name: "Tasks", descKey: "TodoList", icon: "✅", href: "/frostbite-os/tasks", category: "Bundleware" },
    { name: "Media Player", descKey: "MusicPlayerUI", icon: "🎵", href: "/frostbite-os/mediaplayer", category: "Bundleware" },
    { name: "Browser", descKey: "WebBrowser", icon: "🌐", href: "/frostbite-os/browser", category: "Bundleware" },
  ], []);

  const office = APPS.filter(a => a.category === "MS Office");
  const bundle = APPS.filter(a => a.category === "Bundleware");

  return (
    <div style={{ minHeight: "100vh" }}>
      <nav style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid var(--border, #e5e4e7)", background: "var(--card-bg, #111)", flexWrap: "wrap" }}>
        <Link href="/" style={{ color: "var(--accent, #00d4ff)", textDecoration: "none", fontWeight: 700, fontSize: 16 }}>Elite Tech Shop</Link>
        <span style={{ fontSize: 14, opacity: 0.5 }}>|</span>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{t("FrostbiteOS")}</span>
      </nav>

      <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{ fontSize: 48, fontWeight: 900, color: "var(--accent, #00d4ff)", marginBottom: 8 }}>{t("FrostbiteOS")}</h1>
          <p style={{ fontSize: 16, opacity: 0.7 }}>{t("FrostbiteExpansionPack")}</p>
        </div>

        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--accent, #00d4ff)", marginBottom: 16, borderBottom: "1px solid var(--border, #333)", paddingBottom: 8 }}>{t("MSOffice")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16 }}>
            {office.map(app => (
              <Link key={app.name} href={app.href} style={{ textDecoration: "none" }}>
                <div style={{ padding: 20, border: "1px solid var(--border, #333)", borderRadius: 8, background: "var(--card-bg, #111)", cursor: "pointer", transition: "border-color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent, #00d4ff)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border, #333)")}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>{app.icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{app.name}</h3>
                  <p style={{ fontSize: 13, opacity: 0.6 }}>{t(app.descKey)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--accent, #00d4ff)", marginBottom: 16, borderBottom: "1px solid var(--border, #333)", paddingBottom: 8 }}>{t("Bundleware")}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
            {bundle.map(app => (
              <Link key={app.name} href={app.href} style={{ textDecoration: "none" }}>
                <div style={{ padding: 16, border: "1px solid var(--border, #333)", borderRadius: 8, background: "var(--card-bg, #111)", cursor: "pointer", transition: "border-color 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent, #00d4ff)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border, #333)")}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{app.icon}</div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{app.name}</h3>
                  <p style={{ fontSize: 12, opacity: 0.6 }}>{t(app.descKey)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
