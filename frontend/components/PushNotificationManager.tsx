"use client";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/data/navbar-translate.json";

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";
type TranslationEntry = Partial<Record<Lang, string>>;
type TranslationMap = Record<string, TranslationEntry>;
const typedTranslations: TranslationMap = translations;

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isTesting, setIsTesting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { language } = useLanguage();
  const t = useMemo(() => {
    const lang = language as Lang;
    return (key: string) => typedTranslations[key]?.[lang] ?? key;
  }, [language]);

  useEffect(() => {
    if ("Notification" in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration: read browser API on mount
      setPermission(window.Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try { const result = await Notification.requestPermission();   window.dispatchEvent(new StorageEvent("storage", { key: "notification-permission", newValue: result })); }
    catch (error) { console.error("Notification permission error:", error); }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const handler = () => { /* no-op */ };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const sendNotification = useCallback(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      const notification = new Notification(t("NotificationTitle"), { body: t("NotificationBody"), icon: "/favicon.svg", requireInteraction: true });
      notification.onclick = () => { window.focus(); window.location.href = "/"; notification.close(); }; // eslint-disable-line @next/next/no-location-assign-relative-destination
    } catch (error) { console.error("Failed to send notification:", error); }
  }, [t]);

  useEffect(() => {
    if (isTesting) {
      sendNotification();
      intervalRef.current = setInterval(sendNotification, 3000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [isTesting, sendNotification]);

  const toggleTest = useCallback(() => setIsTesting((prev) => !prev), []);

  if (permission === "granted") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.7 }}>
        <span>🔔 {t("NotificationsOn")}</span>
        <button
          onClick={toggleTest}
          style={{
            fontSize: 12,
            padding: "4px 8px",
            background: isTesting ? "var(--neon-blue, #00d4ff)" : "transparent",
            border: "1px solid var(--neon-blue, #00d4ff)",
            borderRadius: 4,
            color: isTesting ? "#000" : "var(--neon-blue, #00d4ff)",
            cursor: "pointer",
          }}
        >
          {isTesting ? "⏹ Stop" : t("Test")}
        </button>
      </div>
    );
  }

  if (permission === "denied") {
    return <p style={{ margin: 0, fontSize: 12, opacity: 0.5, color: "#fc8181" }}>🔕 {t("NotificationsBlocked")}</p>;
  }

  return (
    <button
      onClick={requestPermission}
      style={{
        fontSize: 12,
        padding: "4px 8px",
        background: "transparent",
        border: "1px solid var(--neon-blue, #00d4ff)",
        borderRadius: 4,
        color: "var(--neon-blue, #00d4ff)",
        cursor: "pointer",
      }}
    >
      🔔 {t("EnablePushNotifications")}
    </button>
  );
}
