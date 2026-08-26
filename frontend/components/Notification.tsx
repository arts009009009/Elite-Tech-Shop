"use client";
import { useEffect, useState, useCallback, useRef } from "react";

let notifyFn: (msg: string) => void = () => {};

export function notify(message: string) {
  notifyFn(message);
}

export default function Notification() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((msg: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMessage(msg);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 3000);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  useEffect(() => {
    notifyFn = show;
    const handler = (e: Event) => show((e as CustomEvent).detail);
    window.addEventListener("notify", handler);
    return () => {
      window.removeEventListener("notify", handler);
      notifyFn = () => {};
    };
  }, [show]);

  if (!visible) return null;

  return (
    <div className="animate-slide-in-right gpu" role="status" aria-live="polite" aria-atomic="true">
      {message}
      <style>{`
        .notification-bar {
          position: fixed; top: 16px; right: 16px; z-index: var(--z-toast);
          background: var(--bg-card, #1a1a2e);
          border: 1px solid var(--border-neon, rgba(179,0,255,0.35));
          color: var(--brand, #A020F0);
          padding: 12px 20px; border-radius: var(--radius, 8px);
          font-size: 0.875rem; font-weight: 500;
          box-shadow: 0 0 15px rgba(179,0,255,0.2);
          animation: fadeIn 0.3s ease;
          max-width: 360px;
          transform: translateZ(0);
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
}
