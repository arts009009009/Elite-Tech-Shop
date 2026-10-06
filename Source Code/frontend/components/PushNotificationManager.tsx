"use client";
import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useLanguage } from "@/context/LanguageContext";
import translations from "@/data/navbar-translate.json";

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";
type TranslationEntry = Partial<Record<Lang, string>>;
type TranslationMap = Record<string, TranslationEntry>;
const typedTranslations: TranslationMap = translations;

const NOTIFICATION_ICON = "/elitetech.avif";

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isTesting, setIsTesting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { language } = useLanguage();
  const t = useMemo(() => {
    const lang = language as Lang;
    return (key: string) => typedTranslations[key]?.[lang] ?? key;
  }, [language]);

  const refreshPermission = useCallback(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(window.Notification.permission);
    }
  }, []);

  useEffect(() => {
    refreshPermission();
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => console.error("Service worker registration failed:", error));
  }, [refreshPermission]);

  useEffect(() => {
    const onVisible = () => refreshPermission();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshPermission]);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
          await navigator.serviceWorker.register("/sw.js").catch(() => undefined);
        }
      }
    } catch (error) {
      console.error("Notification permission error:", error);
      refreshPermission();
    }
  }, [refreshPermission]);

  const sendNotification = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (window.Notification.permission !== "granted") return;
    const title = t("NotificationTitle");
    const options: NotificationOptions = {
      body: t("NotificationBody"),
      icon: NOTIFICATION_ICON,
      badge: NOTIFICATION_ICON,
      requireInteraction: true,
      tag: "elite-shop-test",
    };
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.showNotification(title, options);
          return;
        }
      }
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        window.location.href = "/";
        notification.close();
      }; // eslint-disable-line @next/next/no-location-assign-relative-destination
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  }, [t]);

  useEffect(() => {
    if (isTesting) {
      void sendNotification();
      intervalRef.current = setInterval(() => void sendNotification(), 3000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
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
      onClick={() => void requestPermission()}
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
