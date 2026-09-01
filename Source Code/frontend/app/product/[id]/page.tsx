"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useReviews } from "@/context/ReviewContext";
import { useLanguage } from "@/context/LanguageContext";
import type { Review } from "@/context/ReviewContext";
import { formatCurrency } from "@/lib/utils";
import Navbar from "@/components/Navbar";
import RecommendationsWidget from "@/components/RecommendationsWidget";
import RecentlyViewedWidget from "@/components/RecentlyViewed";
import { trackView } from "@/components/RecentlyViewed";
import productTranslations from "@/data/products.json";
import uiStrings from "@/data/navbar-translate.json";
import { apiFetch } from "@/lib/api-fetch";
import OptimizedImage from "@/components/OptimizedImage";
import StickyAddToCart from "@/components/StickyAddToCart";
import StructuredData from "@/components/StructuredData";
import { generateProductJsonLd } from "@/lib/seo";

type Lang = "en" | "ar" | "ru" | "fr" | "es";

type Product = { id: number; title: string; price: number; currency?: string; description?: string; image?: string; category?: string; [key: string]: unknown };
type RawProduct = {
  id: number;
  category?: string;
  image?: string;
  en: { title: string; price: number; currency: string; description?: string };
  ar: { title: string; price: number; currency: string; description?: string };
  ru: { title: string; price: number; currency: string; description?: string };
  fr: { title: string; price: number; currency: string; description?: string };
  es: { title: string; price: number; currency: string; description?: string };
};

const pageCss = `
  .pd-page {
    min-height: 100vh;
    padding: 32px 16px 48px;
  }
  .pd-container {
    max-width: 860px;
    margin: 0 auto;
  }
  .pd-hero {
    position: relative;
    background: var(--card-bg, rgba(15, 15, 30, 0.92));
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    border-radius: 12px;
    padding: 40px 36px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .pd-hero::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(0,212,255,0.04), transparent 60%);
    pointer-events: none;
  }
  .pd-image-gallery {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
    overflow-x: auto;
    padding-bottom: 8px;
  }
  .pd-image-gallery::-webkit-scrollbar { height: 4px; }
  .pd-image-gallery::-webkit-scrollbar-track { background: transparent; }
  .pd-image-gallery::-webkit-scrollbar-thumb { background: var(--border, rgba(255,255,255,0.1)); border-radius: 2px; }
  .pd-image-main {
    position: relative;
    width: 100%;
    max-width: 400px;
    aspect-ratio: 4/3;
    border-radius: 10px;
    overflow: hidden;
    background: var(--bg, rgba(0,0,0,0.2));
  }
  .pd-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-h, var(--text, #e0e0e0));
    margin: 0 0 12px;
    line-height: 1.3;
  }
  .pd-desc {
    font-size: 15px;
    line-height: 1.7;
    color: var(--text, #a0a0b0);
    margin: 0 0 20px;
    opacity: 0.85;
  }
  .pd-price {
    font-size: 28px;
    font-weight: 700;
    color: var(--accent, #00d4ff);
    margin: 0 0 24px;
  }
  .pd-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 14px 32px;
    background: var(--accent, #00d4ff);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: filter 0.2s, transform 0.15s;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .pd-add-btn:hover {
    filter: brightness(1.15);
    transform: translateY(-1px);
  }
  .pd-add-btn:active { transform: translateY(0); }
  .pd-section {
    margin-top: 28px;
    background: var(--card-bg, rgba(15, 15, 30, 0.92));
    border: 1px solid var(--border, rgba(255,255,255,0.08));
    border-radius: 12px;
    padding: 24px 28px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .pd-section-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-h, var(--text, #e0e0e0));
    margin: 0 0 16px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border, rgba(255,255,255,0.08));
  }
  .pd-review-card {
    background: var(--bg, rgba(0,0,0,0.2));
    border: 1px solid var(--border, rgba(255,255,255,0.06));
    border-radius: 8px;
    padding: 14px 16px;
    margin-bottom: 8px;
  }
  .pd-review-card p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text, #c0c0d0);
  }
  .pd-review-empty {
    color: var(--text, #888);
    font-size: 14px;
    padding: 4px 0 8px;
    opacity: 0.7;
  }
  .pd-review-row {
    display: flex;
    gap: 8px;
    margin-top: 12px;
  }
  .pd-review-input {
    flex: 1;
    font-size: 14px;
    padding: 10px 14px;
    background: var(--bg, rgba(255,255,255,0.06));
    border: 1px solid var(--border, rgba(255,255,255,0.15));
    border-radius: 6px;
    color: var(--text, #e0e0e0);
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
  }
  .pd-review-input:focus {
    border-color: var(--accent, #00d4ff);
  }
  .pd-review-input::placeholder {
    color: var(--text, #888);
    opacity: 0.5;
  }
  .pd-review-submit {
    padding: 10px 20px;
    background: var(--accent, #00d4ff);
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: filter 0.2s;
  }
  .pd-review-submit:hover { filter: brightness(1.1); }
  .pd-spinner-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
  }
  .pd-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--border, rgba(255,255,255,0.1));
    border-top-color: var(--accent, #00d4ff);
    border-radius: 50%;
    animation: pd-spin 0.7s linear infinite;
  }
  @keyframes pd-spin { to { transform: rotate(360deg); } }
  .pd-error, .pd-notfound {
    text-align: center;
    padding: 60px 20px;
    color: var(--text, #888);
    font-size: 15px;
  }
  .pd-error { color: #f87171; }
  .pd-breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 20px;
    font-size: 13px;
    color: var(--text, #888);
  }
  .pd-breadcrumb a {
    color: var(--accent, #00d4ff);
    text-decoration: none;
  }
  .pd-breadcrumb a:hover { text-decoration: underline; }
  .light-mode .pd-page { background: rgba(255,255,255,0.92); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
  .light-mode .pd-hero,
  .light-mode .pd-section {
    background: rgba(255,255,255,0.95);
    border-color: rgba(0,0,0,0.08);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }
  .light-mode .pd-hero::before {
    background: linear-gradient(135deg, rgba(160,32,240,0.04), transparent 60%);
  }
  .light-mode .pd-title,
  .light-mode .pd-section-title { color: #111122; }
  .light-mode .pd-desc { color: #444; }
  .light-mode .pd-review-card {
    background: rgba(0,0,0,0.03);
    border-color: rgba(0,0,0,0.06);
  }
  .light-mode .pd-review-card p { color: #333; }
  .light-mode .pd-review-empty { color: #888; }
  .light-mode .pd-review-input {
    background: #fff;
    border-color: #ddd;
    color: #1a1a2e;
  }
  .light-mode .pd-review-input::placeholder { color: #999; opacity: 1; }
  .light-mode .pd-add-btn,
  .light-mode .pd-review-submit { color: #fff; }
  @media (max-width: 600px) {
    .pd-hero { padding: 24px 20px; }
    .pd-title { font-size: 22px; }
    .pd-price { font-size: 22px; }
    .pd-section { padding: 20px 16px; }
  }
`;

export default function ProductDetails() {
  const params = useParams();
  const id = params?.id as string;
  const { language } = useLanguage();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cartCtx = useCart();
  const reviewCtx = useReviews();
  const [newReview, setNewReview] = useState("");

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiFetch<{ id: number; title: string; price: number; currency: string; description?: string; image?: string; category?: string }>(`/api/products/${id}?lang=${language}`, { timeout: 5000, retries: 2, fallback: null });
        setProduct({ id: data.id, title: data.title, price: data.price, currency: data.currency, description: data.description || "", image: data.image, category: data.category });
        trackView({ id: data.id, title: data.title, price: data.price, currency: data.currency });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load product");
      } finally { setLoading(false); }
    };
    if (id) fetchProduct();
  }, [id, language]);

  const handleAddToCart = useCallback(() => {
    if (cartCtx?.addToCart && product) {
      cartCtx.addToCart({ id: product.id, title: product.title, price: product.price, currency: product.currency || "USD" });
    } else {
      window.dispatchEvent(new CustomEvent("notify", { detail: "Cart not available. Please refresh." }));
    }
  }, [cartCtx, product]);

  if (loading) return (
    <>
      <Navbar />
      <style>{pageCss}</style>
      <div className="pd-spinner-wrap"><div className="pd-spinner" /></div>
    </>
  );
  if (error) return <><Navbar /><style>{pageCss}</style><div className="pd-container"><div className="pd-error">{error}</div></div></>;
  if (!product) return <><Navbar /><style>{pageCss}</style><div className="pd-container"><div className="pd-notfound">Product not found</div></div></>;

  const reviews: Review[] = reviewCtx.reviews[product.id] || [];
  const addReview = () => {
    if (newReview.trim()) {
      reviewCtx.addReview(product.id, "Anonymous", 5, newReview);
      setNewReview("");
    }
  };

  const allProducts = useMemo(() => productTranslations.products.map((p: RawProduct) => ({
    id: p.id,
    title: (p as unknown as Record<string, { title: string }>)[language]?.title ?? p.en.title,
    price: (p as unknown as Record<string, { price: number }>)[language]?.price ?? p.en.price,
    currency: (p as unknown as Record<string, { currency: string }>)[language]?.currency ?? p.en.currency,
  })), [language]);

  const jsonLd = generateProductJsonLd({
    id: product.id,
    title: product.title,
    description: product.description as string,
    price: product.price,
    currency: product.currency || "USD",
    image: product.image as string,
    category: product.category as string,
  });

  return (
    <>
      <Navbar />
      <style>{pageCss}</style>
      <StructuredData data={jsonLd} />
      <div className="pd-page">
        <div className="pd-container">
          <nav className="pd-breadcrumb" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span>/</span>
            <a href="/products">Products</a>
            <span>/</span>
            <span>{product.title}</span>
          </nav>

          <div className="pd-hero">
            {product.image && (
              <div className="pd-image-gallery">
                <div className="pd-image-main">
                  <OptimizedImage
                    src={product.image}
                    alt={product.title}
                    fill
                    priority
                    style={{ objectFit: "cover" }}
                  />
                </div>
              </div>
            )}
            <h2 className="pd-title">{product.title}</h2>
            {product.description && <p className="pd-desc">{product.description as string}</p>}
            <p className="pd-price">{formatCurrency(product.price, product.currency || "USD")}</p>
            <button className="pd-add-btn" onClick={handleAddToCart}>
              {uiStrings["AddToCart"]?.[language as Lang] ?? "Add to Cart"}
            </button>
          </div>

          <div className="pd-section">
            <h3 className="pd-section-title">{uiStrings["Reviews"]?.[language as Lang] ?? "Reviews"}</h3>
            {reviews.length === 0 && <p className="pd-review-empty">No reviews yet.</p>}
            {reviews.map((r: Review, i: number) => (
              <div key={i} className="pd-review-card"><p>{r.comment}</p></div>
            ))}
            <div className="pd-review-row">
              <input
                className="pd-review-input"
                value={newReview}
                onChange={(e) => setNewReview(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addReview(); }}
                placeholder={uiStrings["WriteAReview"]?.[language as Lang] ?? "Write a review..."}
              />
              <button className="pd-review-submit" onClick={addReview}>
                {uiStrings["SubmitReview"]?.[language as Lang] ?? "Submit"}
              </button>
            </div>
          </div>

          <div className="pd-section">
            <RecommendationsWidget currentProductId={product.id} products={allProducts} />
          </div>

          <div className="pd-section">
            <RecentlyViewedWidget />
          </div>
        </div>
      </div>

      <StickyAddToCart
        productTitle={product.title}
        price={product.price}
        currency={product.currency || "USD"}
        onAddToCart={handleAddToCart}
      />
    </>
  );
}
