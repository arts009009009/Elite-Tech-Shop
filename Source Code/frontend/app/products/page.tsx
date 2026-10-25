"use client";
import Link from "next/link";
import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api-fetch";
import uiStringsJson from "@/data/navbar-translate.json";

const uiStrings = uiStringsJson as Record<string, Record<string, string>>;

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

// useSearchParams suspends while prerendering, so the reading component must
// sit inside a Suspense boundary or the production build fails.
export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Category links from /categories land here as ?category=… — without this
  // the drill-down silently showed the whole catalog.
  const categoryFilter = (searchParams.get("category") || "").trim();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const ui = useMemo(() => {
    return (key: string) => uiStrings[key]?.[language] ?? key;
  }, [language]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<ProductsApiResponse>(
          `/api/products?lang=${language}`,
          { timeout: 5000, retries: 3, fallback: { products: [], total: 0 } },
        );
        setProducts(Array.isArray(data.products) ? data.products : []);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, [language]);

  const filteredProducts = useMemo(() => {
    if (!categoryFilter) return products;
    const wanted = categoryFilter.toLowerCase();
    return products.filter((p) => (p.category || "").toLowerCase() === wanted);
  }, [products, categoryFilter]);

  const clearCategoryFilter = () => {
    // Drop only the category param so anything else in the URL survives.
    const next = new URLSearchParams(searchParams.toString());
    next.delete("category");
    const qs = next.toString();
    router.replace(qs ? `/products?${qs}` : "/products");
  };

  return (
    <>
      <Navbar />
      <div className="container" style={{ paddingTop: 24, paddingBottom: 24 }}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2>{ui("Products")} ({filteredProducts.length})</h2>
            <Link href="/categories" prefetch style={{ color: "var(--accent, #00d4ff)", textDecoration: "underline", fontSize: 14 }}>
              {ui("BrowseCategories")}
            </Link>
          </div>

          {categoryFilter && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 12px",
                  borderRadius: 999,
                  border: "1px solid var(--accent, #00d4ff)",
                  color: "var(--accent, #00d4ff)",
                  background: "rgba(0, 212, 255, 0.08)",
                  textTransform: "capitalize",
                }}
              >
                {ui(categoryFilter)}
              </span>
              <button
                type="button"
                onClick={clearCategoryFilter}
                aria-label="Clear category filter"
                style={{
                  background: "none",
                  border: "none",
                  color: "#888",
                  cursor: "pointer",
                  fontSize: 13,
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                {ui("ClearAll")}
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
              <p>{ui("TryRefreshing")}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
              <p>{ui("NoProductsAvailable")}</p>
              {categoryFilter && (
                <button
                  type="button"
                  onClick={clearCategoryFilter}
                  style={{ background: "none", border: "none", color: "var(--accent, #00d4ff)", cursor: "pointer", fontSize: 13, marginTop: 8, textDecoration: "underline" }}
                >
                  {ui("ClearAll")}
                </button>
              )}
              <p style={{ fontSize: 12, marginTop: 8 }}>{ui("TryRefreshing")}</p>
            </div>
          ) : (
            <div className="flex items-stretch gap-4 flex-wrap justify-center">
              {filteredProducts.map((p) => (
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
