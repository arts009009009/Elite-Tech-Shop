"use client";
import { useState, useEffect, memo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type Product = { id: number; title: string; price: number; currency: string };
const STORAGE_KEY = "recently_viewed";
const MAX_ITEMS = 8;

function trackView(product: Product) {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Product[];
    const filtered = saved.filter((p) => p.id !== product.id);
    const updated = [{ id: product.id, title: product.title, price: product.price, currency: product.currency }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("recently-viewed-updated"));
  } catch {}
}

function useRecentlyViewed() {
  const [items, setItems] = useState<Product[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Product[];
    } catch { return []; }
  });

  useEffect(() => {
    const handler = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Product[];
        setItems(saved);
      } catch { setItems([]); }
    };
    window.addEventListener("recently-viewed-updated", handler);
    return () => window.removeEventListener("recently-viewed-updated", handler);
  }, []);

  return items;
}

function RecentlyViewedWidget() {
  const items = useRecentlyViewed();
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <p style={{ fontWeight: 600, margin: "0 0 12px 0", fontSize: 18, color: "var(--text, #e0e0e0)" }}>Recently Viewed</p>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {items.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            style={{
              minWidth: 140,
              maxWidth: 140,
              padding: 12,
              border: "1px solid var(--border, #333)",
              borderRadius: 8,
              textDecoration: "none",
              color: "inherit",
              background: "var(--card-bg, #111)",
              transition: "transform 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = ""; }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text, #e0e0e0)" }}>{product.title}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--accent, #00d4ff)", margin: "4px 0 0" }}>{formatCurrency(product.price, product.currency)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export { trackView, useRecentlyViewed, RecentlyViewedWidget };
export default memo(RecentlyViewedWidget);
