"use client";
import { useState, useEffect, memo } from "react";

type FlashSale = {
  id: string;
  title: string;
  discount: number;
  endsAt: string;
};

function getTimeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: false,
  };
}

function FlashSaleBanner({ sales }: { sales: FlashSale[] }) {
  if (sales.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "8px 0" }}>
      {sales.map((sale) => (
        <FlashSaleCard key={sale.id} sale={sale} />
      ))}
    </div>
  );
}

function FlashSaleCard({ sale }: { sale: FlashSale }) {
  const [time, setTime] = useState(() => getTimeLeft(sale.endsAt));

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft(sale.endsAt)), 1000);
    return () => clearInterval(interval);
  }, [sale.endsAt]);

  if (time.expired) return null;

  return (
    <div style={{
      minWidth: 200,
      padding: "12px 16px",
      background: "rgba(255,0,100,0.12)",
      border: "1px solid rgba(255,0,100,0.3)",
      borderRadius: 10,
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: "#ff0064" }}>⚡ {sale.discount}% OFF</span>
      </div>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.8 }}>{sale.title}</p>
      <div style={{ display: "flex", gap: 4, fontSize: 12, fontWeight: 700 }}>
        <span style={{ background: "rgba(255,0,100,0.2)", padding: "2px 6px", borderRadius: 4 }}>{String(time.hours).padStart(2, "0")}</span>
        <span>:</span>
        <span style={{ background: "rgba(255,0,100,0.2)", padding: "2px 6px", borderRadius: 4 }}>{String(time.minutes).padStart(2, "0")}</span>
        <span>:</span>
        <span style={{ background: "rgba(255,0,100,0.2)", padding: "2px 6px", borderRadius: 4 }}>{String(time.seconds).padStart(2, "0")}</span>
      </div>
    </div>
  );
}

function FlashBadge({ endsAt }: { endsAt: string }) {
  const [time, setTime] = useState(() => getTimeLeft(endsAt));

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeLeft(endsAt)), 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (time.expired) return null;

  return (
    <div style={{
      position: "absolute",
      top: 8,
      right: 8,
      background: "#ff0064",
      color: "white",
      padding: "3px 8px",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 700,
      zIndex: 2,
      display: "flex",
      alignItems: "center",
      gap: 4,
    }}>
      ⚡ {String(time.hours).padStart(2, "0")}:{String(time.minutes).padStart(2, "0")}:{String(time.seconds).padStart(2, "0")}
    </div>
  );
}

export { FlashSaleBanner, FlashSaleCard, FlashBadge };
export type { FlashSale };
export default memo(FlashSaleBanner);
