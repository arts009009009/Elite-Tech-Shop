"use client";
import { useRecommendations } from "@/context/RecommendationsContext";
import { useCart } from "@/context/CartContext";
import Link from "next/link";

export default function Recommendations() {
  const { recommendations, loading } = useRecommendations();
  const { addToCart } = useCart();

  if (loading || recommendations.length === 0) return null;

  return (
    <div style={{ padding: "24px 0" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16, color: "var(--accent, #00d4ff)" }}>
        Recommended for You
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
        {recommendations.map((p) => (
          <div key={p.id} style={{ border: "1px solid var(--border, #333)", borderRadius: 10, padding: 16, background: "var(--card-bg, #111)", transition: "transform 0.2s, border-color 0.2s" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "var(--accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.borderColor = "var(--border, #333)"; }}
          >
            <Link href={`/product/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{p.title}</h3>
              <p style={{ fontSize: 16, fontWeight: "bold", color: "#39FF14" }}>
                {p.currency} {p.price.toFixed(2)}
              </p>
              {p.rating && (
                <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  {"★".repeat(Math.round(p.rating))} {p.rating.toFixed(1)}
                </p>
              )}
            </Link>
            <button
              onClick={() => addToCart(p)}
              style={{ marginTop: 8, width: "100%", padding: "8px 0", background: "var(--accent, #00d4ff)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600, minHeight: 40, transition: "filter 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
            >
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
