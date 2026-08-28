"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import ProductCard from "@/components/ProductCard";
import uiStrings from "@/data/navbar-translate.json";
import { useLanguage } from "@/context/LanguageContext";
import { useSearch } from "@/context/SearchContext";
import { useThemeCustomizer } from "@/context/ThemeCustomizerContext";
import { useThemeMode } from "@/context/ThemeModeContext";
import Navbar from "@/components/Navbar";
import LiveSearch from "@/components/LiveSearch";
import VoiceSearch from "@/components/VoiceSearch";
import { FlashSaleBanner } from "@/components/FlashSaleTimer";
import { apiFetch } from "@/lib/api-fetch";
import Recommendations from "@/components/Recommendations";

type Lang = "en" | "ar" | "ru" | "fr" | "es";
type Product = { id: number; title: string; price: number; currency: string; category: string; description?: string; image?: string };

const categories = [
  { label: "All", value: "" },
  { label: "Smartphones", value: "smartphones" },
  { label: "Laptops", value: "laptops" },
];

const gridItemStyle: React.CSSProperties = { flex: "1 1 23%", minWidth: 200, display: "flex" };

const flashSales = [
  { id: "flash-1", title: "MacBook Air M4 — Limited Time", discount: 15, endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() },
  { id: "flash-2", title: "ROG Zephyrus G16 Deal", discount: 10, endsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
];

export default function Home() {
  const { language } = useLanguage();
  const { search, setSearch, liveResults, isSearching } = useSearch();
  const { designSystem } = useThemeCustomizer();
  const { theme } = useThemeMode();
  const isModern = designSystem === "modern";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const parentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem("products");
      if (cached) { setProducts(JSON.parse(cached)); setLoading(false); return; }
    } catch {}
  }, []);

  const fetchProducts = useCallback(async (lang: string) => {
    try {
      setLoading(true);
      const data = await apiFetch<{ products: Product[]; total: number }>(`/api/products?lang=${lang}`, { timeout: 5000, retries: 2, fallback: { products: [], total: 0 } });
      console.log(`[BACKEND] ${new Date().toISOString()} | RUST :3002 | GET /api/products?lang=${lang} | OK`);
      setProducts(data.products || []);
      try { sessionStorage.setItem("products", JSON.stringify(data.products || [])); } catch {}
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts(language);
  }, [language, fetchProducts]);

  useEffect(() => {
    if (parentRef.current) parentRef.current.scrollTop = 0;
  }, [search]);

  const filteredProducts = useMemo(() => {
    const q = search?.toLowerCase() || "";
    return products
      .filter((p) => p.title.toLowerCase().includes(q))
      .filter((p) => !category || p.category === category)
      .filter((p) => !maxPrice || p.price <= maxPrice);
     
  }, [products, search, category, maxPrice]);

  const containerStyle = useMemo(() => ({
    paddingTop: 24,
    paddingBottom: 24,
    ...(isModern && theme !== 'light-mode' ? {
      background: 'rgba(6, 6, 12, 0.92)',
      borderRadius: 'var(--v2-radius, 14px)',
      border: '1px solid var(--v2-border, rgba(120,200,255,0.14))',
    } : {}),
    ...(isModern && theme === 'light-mode' ? {
      background: 'rgba(255, 255, 255, 0.95)',
      borderRadius: 'var(--v2-radius, 14px)',
      border: '1px solid rgba(0, 0, 0, 0.08)',
    } : {}),
  }), [isModern, theme]);

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spinner{width:40px;height:40px;border:4px solid #e2e8f0;border-top-color:var(--accent,#00d4ff);border-radius:50%;animation:spin .8s linear infinite}`}</style>
      <Navbar />
      <div className={`container${theme === 'light-mode' ? ' light-mode-container' : ''}`} style={containerStyle}>
        <div className="flex flex-col gap-4">
          {isModern && (
            <section className="hero" aria-label="Hero">
              <p className="hero-kicker">VIRTUAL MARKET · {uiStrings["Cyberpunk"]?.[language as Lang] ?? "CYBERPUNK"}</p>
              <div style={{ textAlign: 'center' }}>
                <h1 className="hero-title">GEAR UP FOR THE GRID</h1>
              </div>
              <p className="hero-sub">
                {uiStrings["Products"]?.[language as Lang] ?? "Products"} — {uiStrings["Smartphones"]?.[language as Lang] ?? "Smartphones"} &amp; {uiStrings["Laptops"]?.[language as Lang] ?? "Laptops"}. 100 SKUs, 5 languages, specs on everything.
              </p>
              <div className="hero-cta">
                <button className="btn btn-brand btn-lg" onClick={() => setCategory("smartphones")}>
                  {uiStrings["Smartphones"]?.[language as Lang] ?? "Smartphones"}
                </button>
                <button className="btn btn-outline-brand btn-lg" onClick={() => setCategory("laptops")}>
                  {uiStrings["Laptops"]?.[language as Lang] ?? "Laptops"}
                </button>
              </div>
              <div className="hero-stats">
                <div><strong>100</strong><span>Products</span></div>
                <div><strong>5</strong><span>Languages</span></div>
                <div><strong>3</strong><span>Slot Compare</span></div>
                <div><strong>24/7</strong><span>Deals</span></div>
              </div>
            </section>
          )}

          <div className={isModern ? "section-head" : "flex items-center justify-between flex-wrap gap-4"}>
            <h2>{uiStrings["Products"][language as Lang] || "Products"}</h2>
            <div className="flex items-center gap-2">
              <LiveSearch onSearch={(q) => setSearch(q ?? "")} results={liveResults} loading={isSearching} />
              <VoiceSearch onResult={(text) => setSearch(text)} />
            </div>
          </div>

          <FlashSaleBanner sales={flashSales} />

          <div className="flex items-center gap-4 flex-wrap">
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category">
              {categories.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>

            <input
              type="number"
              className="input"
              placeholder={uiStrings["MaxPrice"][language as Lang] || "Max Price"}
              onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : null)}
              value={maxPrice ?? ""}
              style={{ maxWidth: 150 }}
              aria-label="Maximum price filter"
            />
          </div>

          <div ref={parentRef}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                <div className="spinner" />
              </div>
            ) : (
              <div className="flex items-stretch gap-4 flex-wrap justify-center stagger-children">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="w-full" style={gridItemStyle}>
                    <ProductCard
                      product={product}
                      addToCartLabel={uiStrings["AddToCart"][language as Lang] || "Add to Cart"}
                      wishlistLabel={uiStrings["Wishlist"][language as Lang] || "Wishlist"}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {!loading && (
            <p className="text-sm text-center opacity-60">
              {uiStrings["Showing"][language as Lang] || "Showing"} <strong>{filteredProducts.length}</strong> {uiStrings["Products"][language as Lang] || "Products"}
            </p>
          )}

          <Recommendations />
        </div>
      </div>
    </>
  );
}
