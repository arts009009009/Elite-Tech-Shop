"use client";
import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSearch } from "@/context/SearchContext";
import { useRewards } from "@/context/RewardsContext";
import { useThemeCustomizer } from "@/context/ThemeCustomizerContext";
import { useThemeMode } from "@/context/ThemeModeContext";
import { useGlitch } from "@/components/GlitchMode";
import translations from "@/data/navbar-translate.json";

const RewardsDashboard = lazy(() => import("./RewardsDashboard"));
const PushNotificationManager = lazy(() => import("./PushNotificationManager"));

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";
type TranslationEntry = Partial<Record<Lang, string>>;
type TranslationMap = Record<string, TranslationEntry>;
const typedTranslations: TranslationMap = translations;

const languages = { items: [
  { label: "EN", value: "en" }, { label: "AR", value: "ar" }, { label: "RU", value: "ru" },
  { label: "FR", value: "fr" }, { label: "ES", value: "es" }, { label: "DE", value: "de" },
  { label: "ZH", value: "zh" }, { label: "JA", value: "ja" }, { label: "PT", value: "pt" },
  { label: "HI", value: "hi" },
] };

export default function Navbar() {
  const pathname = usePathname();
  const { cart } = useCart();
  const { language, setLanguage, isRTL } = useLanguage();
  const { search, setSearch } = useSearch();
  const { points } = useRewards();
  const { toggleCustomizer, designSystem } = useThemeCustomizer();
  const { theme, cycleTheme } = useThemeMode();
  const { toggleHighContrast, highContrast, toggleReducedMotion, reducedMotion } = useThemeCustomizer();
  const { active: glitchActive, toggle: toggleGlitch } = useGlitch();

  const [mounted, setMounted] = useState(false);
  const isClassic = mounted && designSystem === "classic";

  const [showMadeWith, setShowMadeWith] = useState(false);
  const [showRewards, setShowRewards] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount flag
    setMounted(true);
  }, []);

  const labels = useMemo(() => {
    const lang = language as Lang;
    const t = (key: string) => typedTranslations[key]?.[lang] ?? key;
    return {
      home: t("Home"),
      checkout: t("Checkout"),
      wishlist: t("Wishlist"),
      orders: t("Orders"),
      admin: t("Admin"),
      login: t("Login"),
      signup: t("Signup"),
      cart: t("Cart"),
      search: t("Search..."),
      version: "5.0 Stable",
      versionLabel: t("Version"),
      products: t("Products"),
      categories: t("Categories"),
      minigame: t("Minigame"),
      frostbiteOS: t("Frostbite OS"),
      profile: t("Profile"),
      analytics: t("Analytics"),
      credits: t("Credits"),
      rewards: t("Rewards"),
      customizeTheme: t("CustomizeTheme"),
      highContrast: t("HighContrast"),
      animationsOn: t("AnimationsOn"),
      animationsOff: t("AnimationsOff"),
      glitch: t("Glitch"),
      madeWith: t("MadeWith"),
      themeLight: t("Light"),
      themeDark: t("Dark"),
      themeNeon: t("Cyberpunk"),
      themeLabel: theme === "dark-mode" ? t("Dark") : theme === "cyberpunk-mode" ? t("Cyberpunk") : t("Light"),
    };
  }, [language, theme]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setSearch(e.target.value.toLowerCase()); }, [setSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); const input = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement; input?.focus(); }
      if (e.key === "Escape") { setShowRewards(false); setShowMadeWith(false); }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "D") { e.preventDefault(); cycleTheme(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [theme, cycleTheme]);

  const navLinks = useMemo(() => [
    { path: "/", label: labels.home },
    { path: "/products", label: labels.products },
    { path: "/categories", label: labels.categories },
    { path: "/minigame", label: labels.minigame },
    { path: "/frostbite-os", label: labels.frostbiteOS },
    { path: "/cart", label: labels.cart },
    { path: "/checkout", label: labels.checkout },
    { path: "/wishlist", label: labels.wishlist },
    { path: "/orders", label: labels.orders },
    { path: "/profile", label: labels.profile },
    { path: "/analytics", label: labels.analytics },
    { path: "/admin", label: labels.admin },
  ], [labels]);

  const brandColor = "var(--accent)";

  if (isClassic) {
    return (
      <nav className="navbar" style={{ padding: "12px", borderBottom: "1px solid var(--border, #e5e4e7)" }} dir={isRTL ? "rtl" : "ltr"} role="navigation" aria-label="Main navigation">
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", position: "relative" }}>
          <div style={{ display: "flex", flexDirection: "row", gap: "12px", flexWrap: "wrap" }}>
            {navLinks.map(({ path, label }) => {
              const isActive = pathname === path;
              return (
                <Link
                  key={path}
                  href={path}
                  prefetch
                  aria-current={isActive ? "page" : undefined}
                  style={{
                    fontSize: "14px",
                    padding: "6px 12px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    textDecoration: "none",
                    backgroundColor: isActive ? brandColor : "transparent",
                    color: isActive ? "white" : brandColor,
                    border: "none",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <span style={{ backgroundColor: brandColor, color: "white", fontSize: "14px", padding: "0 8px", borderRadius: "4px" }}>
            {labels.cart}: {mounted ? cart.length : 0}
          </span>

          <input
            placeholder={labels.search}
            value={search}
            onChange={handleSearchChange}
            style={{ fontSize: "14px", padding: "6px 12px", maxWidth: "160px", border: "1px solid #d4d4d8", borderRadius: "4px" }}
            aria-label="Search products"
          />

          <Suspense fallback={null}><PushNotificationManager /></Suspense>

          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            aria-label="Language"
            style={{ fontSize: "14px", padding: "6px 12px", borderRadius: "4px", border: "1px solid #d4d4d8" }}
          >
            {languages.items.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <button
            onClick={cycleTheme}
            aria-label={`Switch theme (current: ${labels.themeLabel})`}
            style={{ fontSize: "14px", padding: "6px 12px", border: `1px solid ${brandColor}`, color: brandColor, backgroundColor: "transparent", borderRadius: "4px", cursor: "pointer" }}
          >
            {labels.themeLabel}
          </button>

          <button
            onClick={toggleCustomizer}
            title={labels.customizeTheme}
            aria-label={labels.customizeTheme}
            style={{ fontSize: "14px", padding: "6px 12px", border: "1px solid #A020F0", color: "#A020F0", backgroundColor: "transparent", borderRadius: "4px", cursor: "pointer" }}
          >
            🎨
          </button>

          <button
            onClick={toggleHighContrast}
            aria-label={labels.highContrast}
            title={labels.highContrast}
            style={{ fontSize: "14px", padding: "6px 12px", border: `1px solid ${highContrast ? "#ffd700" : "#888"}`, color: highContrast ? "#ffd700" : "#888", backgroundColor: "transparent", borderRadius: "4px", cursor: "pointer" }}
          >
            {highContrast ? "☀️ HC" : "☁️"}
          </button>

          <button
            onClick={toggleReducedMotion}
            aria-label={reducedMotion ? labels.animationsOn : labels.animationsOff}
            title={reducedMotion ? labels.animationsOff : labels.animationsOn}
            style={{ fontSize: "14px", padding: "6px 12px", border: `1px solid ${reducedMotion ? "#48bb78" : "#888"}`, color: reducedMotion ? "#48bb78" : "#888", backgroundColor: "transparent", borderRadius: "4px", cursor: "pointer" }}
          >
            {reducedMotion ? "🐢" : "⚡"}
          </button>

          <button
            onClick={toggleGlitch}
            className="glitch-button"
            aria-label={labels.glitch}
            style={{ fontSize: "13px", padding: "6px 12px", fontFamily: "monospace", fontWeight: "bold", color: glitchActive ? "#000" : "#ff0040", background: glitchActive ? "#ff0040" : "transparent", border: "1px solid #ff0040", borderRadius: "4px", cursor: "pointer", letterSpacing: 1 }}
          >
            {glitchActive ? "GL1TCH" : labels.glitch}
          </button>

          <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
            <Link href="/login" style={{ fontSize: "14px", padding: "6px 12px", backgroundColor: "transparent", border: "none", cursor: "pointer", color: brandColor, textDecoration: "none" }}>{labels.login}</Link>
            <Link href="/signup" style={{ fontSize: "14px", padding: "6px 12px", backgroundColor: "transparent", border: "none", cursor: "pointer", color: brandColor, textDecoration: "none" }}>{labels.signup}</Link>
          </div>

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowMadeWith(!showMadeWith)}
              className="neon-lava"
            >
              {labels.madeWith}
            </button>
            {showMadeWith && (
              <div style={{ padding: "12px", border: "1px solid var(--border, #d4d4d8)", borderRadius: "8px", position: "absolute", top: "100%", right: 0, backgroundColor: "var(--bg, white)", zIndex: "var(--z-dropdown)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
                <Link href="/credits" style={{ fontSize: "12px", padding: "4px 8px", backgroundColor: "transparent", border: "none", cursor: "pointer", color: "var(--accent, #00d4ff)", textDecoration: "none" }}>{labels.credits}</Link>
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowRewards(!showRewards)}
              title={labels.rewards}
              style={{ fontSize: "14px", padding: "6px 12px", border: "1px solid #ecc94b", color: "#ecc94b", backgroundColor: "transparent", borderRadius: "9999px", cursor: "pointer" }}
            >
              ⭐ {points}
            </button>
            {showRewards && (
              <div style={{ position: "absolute", top: "100%", right: 0, zIndex: "var(--z-dropdown)", marginTop: "4px" }}>
                <Suspense fallback={null}><RewardsDashboard /></Suspense>
              </div>
            )}
          </div>

          <p style={{ fontSize: "12px", opacity: 0.6 }}>
            {labels.versionLabel} {labels.version}
          </p>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar" style={{ padding: "12px" }} dir={isRTL ? "rtl" : "ltr"} role="navigation" aria-label="Main navigation">
      <div className="container navbar-inner">
        <Link href="/" className="navbar-brand" style={{ textDecoration: "none" }}>
          <span className="brand-ico">⚡</span>ELITE<em>SHOP</em>
        </Link>

        <div className="navbar-nav">
          {navLinks.map(({ path, label }) => {
            const isActive = pathname === path;
            return (
              <Link
                key={path}
                href={path}
                prefetch
                aria-current={isActive ? "page" : undefined}
                className={isActive ? "active-nav" : undefined}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <span className="nav-cart">
          {labels.cart}: {mounted ? cart.length : 0}
        </span>

        <input
          className="input"
          placeholder={labels.search}
          value={search}
          onChange={handleSearchChange}
          aria-label="Search products"
          style={{ maxWidth: "180px" }}
        />

        <Suspense fallback={null}><PushNotificationManager /></Suspense>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          aria-label="Language"
        >
          {languages.items.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>

        <button
          onClick={cycleTheme}
          aria-label={`Switch theme (current: ${labels.themeLabel})`}
          style={{
            fontSize: "14px",
            padding: "6px 12px",
            border: `1px solid ${brandColor}`,
            color: brandColor,
            backgroundColor: "transparent",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {labels.themeLabel}
        </button>

        <button
          onClick={toggleCustomizer}
          title={labels.customizeTheme}
          aria-label={labels.customizeTheme}
          style={{
            fontSize: "14px",
            padding: "6px 12px",
            border: "1px solid #A020F0",
            color: "#A020F0",
            backgroundColor: "transparent",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          🎨
        </button>

        <button
          onClick={toggleHighContrast}
          aria-label={labels.highContrast}
          title={labels.highContrast}
          style={{
            fontSize: "14px",
            padding: "6px 12px",
            border: `1px solid ${highContrast ? "#ffd700" : "#888"}`,
            color: highContrast ? "#ffd700" : "#888",
            backgroundColor: "transparent",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {highContrast ? "☀️ HC" : "☁️"}
        </button>

        <button
          onClick={toggleReducedMotion}
          aria-label={reducedMotion ? labels.animationsOn : labels.animationsOff}
          title={reducedMotion ? labels.animationsOff : labels.animationsOn}
          style={{
            fontSize: "14px",
            padding: "6px 12px",
            border: `1px solid ${reducedMotion ? "#48bb78" : "#888"}`,
            color: reducedMotion ? "#48bb78" : "#888",
            backgroundColor: "transparent",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          {reducedMotion ? "🐢" : "⚡"}
        </button>

        <button
          onClick={toggleGlitch}
          className="glitch-button"
          aria-label={labels.glitch}
          style={{
            fontSize: "13px",
            padding: "6px 12px",
            fontFamily: "monospace",
            fontWeight: "bold",
            color: glitchActive ? "#000" : "#ff0040",
            background: glitchActive ? "#ff0040" : "transparent",
            border: "1px solid #ff0040",
            borderRadius: "4px",
            cursor: "pointer",
            letterSpacing: 1,
          }}
        >
          {glitchActive ? "GL1TCH" : labels.glitch}
        </button>

        <div style={{ display: "flex", flexDirection: "row", gap: "8px" }}>
          <Link href="/login" style={{ fontSize: "14px", padding: "6px 12px", backgroundColor: "transparent", border: "none", cursor: "pointer", color: brandColor, textDecoration: "none" }}>{labels.login}</Link>
          <Link href="/signup" style={{ fontSize: "14px", padding: "6px 12px", backgroundColor: "transparent", border: "none", cursor: "pointer", color: brandColor, textDecoration: "none" }}>{labels.signup}</Link>
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowMadeWith(!showMadeWith)}
            className="neon-lava"
          >
            {labels.madeWith}
          </button>
          {showMadeWith && (
            <div style={{ padding: "12px", border: "1px solid var(--border, #d4d4d8)", borderRadius: "8px", position: "absolute", top: "100%", right: 0, backgroundColor: "var(--bg, white)", zIndex: "var(--z-dropdown)", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}>
              <Link href="/credits" style={{ fontSize: "12px", padding: "4px 8px", backgroundColor: "transparent", border: "none", cursor: "pointer", color: "var(--accent, #00d4ff)", textDecoration: "none" }}>{labels.credits}</Link>
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            onClick={() => setShowRewards(!showRewards)}
            title={labels.rewards}
            style={{
              fontSize: "14px",
              padding: "6px 12px",
              border: "1px solid #ecc94b",
              color: "#ecc94b",
              backgroundColor: "transparent",
              borderRadius: "9999px",
              cursor: "pointer",
            }}
          >
            ⭐ {points}
          </button>
          {showRewards && (
            <div style={{ position: "absolute", top: "100%", right: 0, zIndex: "var(--z-dropdown)", marginTop: "4px" }}>
              <Suspense fallback={null}><RewardsDashboard /></Suspense>
            </div>
          )}
        </div>

        <p style={{ fontSize: "12px", opacity: 0.6 }}>
          {labels.versionLabel} {labels.version}
        </p>
      </div>
    </nav>
  );
}
