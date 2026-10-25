"use client";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useInventory } from "@/context/InventoryContext";

type AlertEntry = { productId: number; quantity: number; dismissed: boolean };

function urgencyColor(qty: number): string {
  return qty <= 2 ? "#ff4444" : "#ffa600";
}

function StockAlerts() {
  const { lowStockItems } = useInventory();
  const [alerts, setAlerts] = useState<AlertEntry[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const removalTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const prevIdsRef = useRef<Set<number>>(new Set());
  const alertsRef = useRef<AlertEntry[]>([]);
  useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  const dismiss = useCallback((id: number) => {
    // Forgetting the id here (and when it leaves lowStockItems) lets a
    // restocked-then-low product alert again later in the session.
    prevIdsRef.current.delete(id);
    setAlerts((prev) => prev.map((a) => (a.productId === id ? { ...a, dismissed: true } : a)));
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
    const existing = removalTimersRef.current.get(id);
    if (existing) clearTimeout(existing);
    removalTimersRef.current.set(id, setTimeout(() => {
      removalTimersRef.current.delete(id);
      setAlerts((prev) => prev.filter((a) => a.productId !== id));
    }, 400));
  }, []);

  useEffect(() => {
    const currentIds = new Set(lowStockItems.map((item) => item.productId));
    const existing = prevIdsRef.current;
    // Forget products that are no longer low on stock so they can alert again
    // after a restock.
    for (const id of Array.from(existing)) {
      if (!currentIds.has(id)) existing.delete(id);
    }
    // Read the live alerts through a ref so this effect only re-runs when
    // stock actually changes (depending on `alerts` would re-alert in a loop).
    const activeAlertIds = new Set(alertsRef.current.map((a) => a.productId));
    const newAlerts: AlertEntry[] = [];
    for (const item of lowStockItems) {
      if (!existing.has(item.productId) && !activeAlertIds.has(item.productId)) {
        existing.add(item.productId);
        newAlerts.push({ productId: item.productId, quantity: item.quantity, dismissed: false });
        const timer = setTimeout(() => dismiss(item.productId), 8000);
        timersRef.current.set(item.productId, timer);
      }
    }
    if (newAlerts.length > 0) {
      queueMicrotask(() => setAlerts((prev) => [...prev, ...newAlerts]));
    }
  }, [lowStockItems, dismiss]);

  useEffect(() => {
    const timers = timersRef.current;
    const removalTimers = removalTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      removalTimers.forEach((t) => clearTimeout(t));
      removalTimers.clear();
    };
  }, []);

  return (
    <>
      {alerts.map((a) => {
        const color = urgencyColor(a.quantity);
        return (
          <div
            key={a.productId}
            className={`stock-alert ${a.dismissed ? "stock-alert-dismiss" : ""}`}
            style={{ "--glow": color } as React.CSSProperties}
            role="alert"
            aria-live="assertive"
          >
            <span className="stock-alert-dot" style={{ background: color }} />
            <span>Only {a.quantity} left in stock!</span>
            <button className="stock-alert-close" onClick={() => dismiss(a.productId)} aria-label="Dismiss">
              &times;
            </button>
          </div>
        );
      })}
      <style>{`
        .stock-alert {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          background: rgba(10, 10, 20, 0.92);
          border: 1px solid var(--glow, #ffa600);
          border-radius: 12px;
          box-shadow: 0 0 18px color-mix(in srgb, var(--glow, #ffa600) 40%, transparent),
                      inset 0 0 12px color-mix(in srgb, var(--glow, #ffa600) 10%, transparent);
          color: #fff;
          font-size: 0.875rem;
          font-weight: 500;
          animation: stock-alert-slide-in 0.35s ease-out;
          transform: translateZ(0);
          backface-visibility: hidden;
          pointer-events: auto;
          max-width: 340px;
        }
        .stock-alert-dismiss {
          animation: stock-alert-slide-out 0.4s ease-in forwards;
        }
        .stock-alert-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          animation: stock-alert-pulse 1.5s ease-in-out infinite;
        }
        .stock-alert-close {
          margin-left: auto;
          background: none;
          border: none;
          color: #888;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
          transition: color 0.15s;
        }
        .stock-alert-close:hover { color: #fff; }
        @keyframes stock-alert-slide-in {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes stock-alert-slide-out {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(110%); opacity: 0; }
        }
        @keyframes stock-alert-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.8); }
        }
      `}</style>
    </>
  );
}

export default memo(StockAlerts);
