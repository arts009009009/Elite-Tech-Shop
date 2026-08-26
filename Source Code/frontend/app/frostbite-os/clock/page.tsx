"use client";

import { useState, useEffect } from "react";
import FrostbiteOSLayout from "@/components/frostbite-os/FrostbiteOSLayout";

type TZ = "Local" | "UTC" | "EST" | "PST" | "JST";

const TZ_OFFSETS: Record<TZ, string> = {
  Local: "",
  UTC: "UTC",
  EST: "America/New_York",
  PST: "America/Los_Angeles",
  JST: "Asia/Tokyo",
};

const TZ_LABELS: TZ[] = ["Local", "UTC", "EST", "PST", "JST"];

export default function ClockPage() {
  const [now, setNow] = useState(new Date());
  const [tz, setTz] = useState<TZ>("Local");

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString("en-US", {
    hour12: false,
    timeZone: TZ_OFFSETS[tz] || undefined,
  });

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TZ_OFFSETS[tz] || undefined,
  });

  return (
    <FrostbiteOSLayout title="Clock">
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 16,
      }}>
        <div style={{
          fontSize: 72,
          fontFamily: "monospace",
          color: "var(--accent, #00d4ff)",
          letterSpacing: 4,
          textShadow: "0 0 20px rgba(0,212,255,0.3)",
        }}>
          {timeStr}
        </div>
        <div style={{
          fontSize: 20,
          color: "var(--text, #e0e0e0)",
        }}>
          {dateStr}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
          {TZ_LABELS.map((t) => (
            <button
              key={t}
              onClick={() => setTz(t)}
              style={{
                padding: "6px 16px",
                borderRadius: 4,
                border: "1px solid var(--border, #333)",
                background: tz === t ? "var(--accent, #00d4ff)" : "var(--card-bg, #111)",
                color: tz === t ? "#000" : "var(--text, #e0e0e0)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: tz === t ? 700 : 400,
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </FrostbiteOSLayout>
  );
}
