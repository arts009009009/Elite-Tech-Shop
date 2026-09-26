"use client";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api-fetch";

type Lang = "en" | "ar" | "ru" | "fr" | "es" | "de" | "zh" | "ja" | "pt" | "hi";

type Product = {
  id: number;
  title: string;
  price: number;
  currency: string;
  category?: string;
};

type ProductsApiResponse = {
  products: Product[];
  total: number;
};

export default function ProductsPage() {
  const { language } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const ui = useMemo(() => {
    const strings = require("@/data/navbar-translate.json") as Record<string, Record<string, string>>;
    return (key: string) => strings[key]?.[language] ?? key;
  }, [language]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<ProductsApiResponse>(
          `/api/products?lang=${language}`,
          { timeout: 5000, retries: 3, fallback: { products: [], total: 0 } },
        );
        setProducts(data.products ?? []);
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
            <h2>{ui("Products")} ({products.length})</h2>
            <Link href="/categories" prefetch style={{ color: "var(--accent, #00d4ff)", textDecoration: "underline", fontSize: 14 }}>
              {ui("BrowseCategories")}
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
              <p>{ui("TryRefreshing")}</p>
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
              <p>{ui("NoProductsAvailable")}</p>
              <p style={{ fontSize: 12, marginTop: 8 }}>{ui("TryRefreshing")}</p>
            </div>
          ) : (
            <div className="flex items-stretch gap-4 flex-wrap justify-center">
              {products.map((p) => (
                <Link
                  key={p.id}
                  href={`/product/${p.id}`}
                  prefetch
                  className="w-full"
                  style={{
                    flex: "1 1 23%",
                    minWidth: 200,
                    display: "flex",
                    padding: 16,
                    border: "1px solid #333",
                    borderRadius: 8,
                    background: "#111",
                    color: "#eee",
                    textDecoration: "none",
                    flexDirection: "column",
                  }}
                >
                  <h3 style={{ fontSize: 16, fontWeight: 600 }}>{p.title}</h3>
                  <p style={{ fontSize: 18, fontWeight: "bold", color: "#39FF14", marginTop: 8 }}>
                    {p.currency} {p.price.toFixed(2)}
                  </p>
                  {p.category && (
                    <span style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                      {ui(p.category)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
