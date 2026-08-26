"use client";
import { useMemo } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

type Product = { id: number; title: string; price: number; currency: string; image?: string; category?: string };

export default function RecommendationsWidget({ currentProductId, products, title = "You May Also Like" }: { currentProductId?: number; products: Product[]; title?: string }) {
  const recommended = useMemo(() => {
    if (!currentProductId) return products.slice(0, 4);
    return products.filter((p) => p.id !== currentProductId).slice(0, 4);
  }, [currentProductId, products]);

  if (recommended.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <p style={{ fontWeight: 600, margin: "0 0 12px 0", fontSize: 18, color: "var(--text, #e0e0e0)" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "row", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {recommended.map((product) => (
          <Link
            key={product.id}
            href={`/product/${product.id}`}
            style={{
              minWidth: 160,
              maxWidth: 160,
              padding: 12,
              border: "1px solid var(--border, rgba(255,255,255,0.08))",
              borderRadius: 8,
              textDecoration: "none",
              color: "inherit",
              background: "var(--card-bg, rgba(20,20,40,0.85))",
              transition: "transform 0.2s, border-color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.borderColor = ""; }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 600,
                margin: 0,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                color: "var(--text, #e0e0e0)",
              }}
            >
              {product.title}
            </p>
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "var(--accent, #00d4ff)",
                margin: 0,
                marginTop: 4,
              }}
            >
              {formatCurrency(product.price, product.currency)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
