"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type Product = { id: number; title: string; price: number; currency: string; category?: string; image?: string };

export default function EdgeRecommendations({ currentProductId }: { currentProductId?: number }) {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [segment, setSegment] = useState<string>("anonymous");

  const fetchPersonalized = useCallback(async () => {
    setLoading(true);
    try {
      const browseHistory = JSON.parse(localStorage.getItem("recently_viewed") || "[]") as number[];
      const cartItems = JSON.parse(localStorage.getItem("cart_ids") || "[]") as number[];

      const headers: Record<string, string> = {};
      if (browseHistory.length > 0) headers["x-browse-history"] = browseHistory.join(",");
      if (cartItems.length > 0) headers["x-cart-items"] = cartItems.join(",");

      const res = await fetch("/api/recommendations/personalized", { headers });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
        setSegment(data.segment || "anonymous");
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPersonalized();
  }, [fetchPersonalized]);

  const filtered = useMemo(() => {
    if (!currentProductId) return recommendations;
    return recommendations.filter((p) => p.id !== currentProductId);
  }, [recommendations, currentProductId]);

  if (loading || filtered.length === 0) return null;

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--accent, #00d4ff)", margin: 0 }}>
          Recommended for You
        </h3>
        {segment !== "anonymous" && (
          <span style={{ fontSize: 11, color: "var(--text, #888)", background: "rgba(0,212,255,0.1)", padding: "2px 8px", borderRadius: 9999 }}>
            {segment}
          </span>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            style={{
              padding: 14,
              border: "1px solid var(--border, rgba(255,255,255,0.08))",
              borderRadius: 10,
              textDecoration: "none",
              color: "inherit",
              background: "var(--card-bg, rgba(15,15,30,0.92))",
              transition: "transform 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = ""; }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.4, color: "var(--text, #e0e0e0)" }}>
              {product.title}
            </p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "var(--accent, #00d4ff)", margin: 0, marginTop: 8 }}>
              {formatCurrency(product.price, product.currency)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
