"use client";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api-fetch";

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";

type CategoriesResponse = { categories: string[]; total: number };
type ProductsResponse = { products: { id: number; category?: string }[]; total: number };

const categoryEmojis: Record<string, string> = {
  laptops: "💻",
  smartphones: "📱",
};

export default function CategoriesPage() {
  const { language } = useLanguage();
  const [categories, setCategories] = useState<string[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const ui = useMemo(() => {
    const strings = require("@/data/navbar-translate.json") as Record<string, Record<string, string>>;
    return (key: string) => strings[key]?.[language] ?? key;
  }, [language]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [catData, prodData] = await Promise.all([
          apiFetch<CategoriesResponse>("/api/categories", { timeout: 5000, retries: 3, fallback: { categories: [], total: 0 } }),
          apiFetch<ProductsResponse>(`/api/products?lang=${language}`, { timeout: 5000, retries: 3, fallback: { products: [], total: 0 } }),
        ]);
        const cats = catData.categories ?? [];
        setCategories(cats);
        const c: Record<string, number> = {};
        for (const p of prodData.products ?? []) {
          const cat = (p.category as string) || "uncategorized";
          c[cat] = (c[cat] || 0) + 1;
        }
        setCounts(c);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, [language]);

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2>{ui("Categories")} ({categories.length})</h2>
            <Link href="/products" prefetch style={{ color: "var(--accent, #00d4ff)", textDecoration: "underline", fontSize: 14 }}>
              {ui("AllProducts")}
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
              <p>{ui("TryRefreshing")}</p>
            </div>
          ) : categories.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
              <p>{ui("NoCategoriesAvailable")}</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>{ui("TryRefreshing")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/products?category=${cat}`}
                  prefetch
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: 20,
                    border: "1px solid #333",
                    borderRadius: 8,
                    background: "#111",
                    color: "#eee",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ fontSize: 32 }}>{categoryEmojis[cat] || "📦"}</span>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, textTransform: "capitalize" }}>{ui(cat)}</h3>
                    <p style={{ fontSize: 14, color: "#888" }}>{ui("XProducts").replace("{count}", String(counts[cat] || 0))}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
