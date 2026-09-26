"use client";
import { useEffect, useState, useRef } from "react";
import ProductCard from "@/components/ProductCard";
import { useUser } from "@/context/UserContext";
import productTranslations from "@/data/products.json";
import uiStrings from "@/data/navbar-translate.json";
import { useLanguage } from "@/context/LanguageContext";
import WishlistShare from "@/components/WishlistShare";
import { useRewards } from "@/context/RewardsContext";
import Navbar from "@/components/Navbar";

const sortOptions = [
  { label: "Default", value: "default" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Name A-Z", value: "title" },
];

type Lang = "en" | "ar" | "ru" | "fr" | "es";
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
type Product = { id: number; title: string; price: number; currency: string; category: string; description: string; image: string };

export default function Wishlist() {
  const userCtx = useUser();
  const { language } = useLanguage();
  const username = userCtx.user?.username ?? null;
  const { addPoints } = useRewards();
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<number[]>(() => {
    if (username) {
      try { const saved = localStorage.getItem(`wishlist_${username}`); return saved ? JSON.parse(saved) : []; }
      catch { return []; }
    }
    return [];
  });
  const [sortBy, setSortBy] = useState<string>("default");
  const productsInitialized = useRef(false);

  useEffect(() => {
    if (!username) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initializing from localStorage
    try { const saved = localStorage.getItem(`wishlist_${username}`); setWishlist(saved ? JSON.parse(saved) : []); }
    catch { setWishlist([]); }
  }, [username]);

  useEffect(() => {
    if (productsInitialized.current) return;
    productsInitialized.current = true;
    const lang = language as Lang;
    try {
      const translatedProducts = productTranslations.products.map((p: RawProduct) => ({
        id: p.id,
        title: p[lang]?.title ?? p.en.title,
        price: Number(p[lang]?.price ?? p.en.price),
        currency: p[lang]?.currency ?? p.en.currency,
        category: p.category ?? "",
        description: p[lang]?.description ?? p.en.description ?? "",
        image: p.image ?? "",
      }));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lazy init via ref prevents double-render
      setProducts(translatedProducts);
    } catch { setProducts([]); }
  }, [language]);
  const saveWishlist = (updated: number[]) => {
    if (!username) return;
    try { setWishlist(updated); localStorage.setItem(`wishlist_${username}`, JSON.stringify(updated)); }
    catch { window.dispatchEvent(new CustomEvent("notify", { detail: "Failed to save wishlist." })); }
  };

  const removeFromWishlist = (id: number) => {
    const updated = wishlist.filter((itemId) => itemId !== id);
    saveWishlist(updated);
    window.dispatchEvent(new CustomEvent("notify", { detail: "Removed!" }));
  };

  const clearWishlist = () => {
    if (!username) return;
    try { localStorage.removeItem(`wishlist_${username}`); setWishlist([]); window.dispatchEvent(new CustomEvent("notify", { detail: "Cleared!" })); }
    catch { window.dispatchEvent(new CustomEvent("notify", { detail: "Failed to clear wishlist." })); }
  };

  const addAllToCart = () => {
    if (!username) return;
    try {
      filtered.forEach((p) => { window.dispatchEvent(new CustomEvent("add-to-cart", { detail: p })); });
      addPoints(filtered.length * 5);
      window.dispatchEvent(new CustomEvent("notify", { detail: `Added ${filtered.length} items to cart! +${filtered.length * 5} bonus points` }));
    } catch { window.dispatchEvent(new CustomEvent("notify", { detail: "Failed to add items to cart." })); }
  };

  const filtered = [...products.filter((p) => wishlist.includes(p.id))].sort((a, b) => {
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "title") return a.title.localeCompare(b.title);
    return 0;
  });

  return (
    <>
      <Navbar />
      <div className="container max-w-[1024px] py-6">
        <div className="page-card">
          <h2 className="mb-4">
            {uiStrings["Wishlist"][language as Lang] || "Wishlist"}
            {wishlist.length > 0 && <span className="text-md opacity-60 ml-2">({wishlist.length})</span>}
          </h2>
          {username && (
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <button className="btn btn-sm btn-outline-red" onClick={clearWishlist}>{uiStrings["ClearWishlist"][language as Lang] || "Clear Wishlist"}</button>
              {filtered.length > 0 && <button className="btn btn-sm btn-outline-brand" onClick={addAllToCart}>🛒 Add All to Cart</button>}
              {filtered.length > 0 && <WishlistShare wishlistIds={wishlist} username={username} />}
              <select className="select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {sortOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
          )}
          {!username ? (
            <p>{uiStrings["Login"][language as Lang] || "Login"} {uiStrings["Wishlist"][language as Lang] || "Wishlist"}</p>
          ) : filtered.length === 0 ? (
            <p>{uiStrings["NoItems"][language as Lang] || "No items in wishlist."}</p>
          ) : (
            <div className="flex items-stretch gap-4 flex-wrap justify-center">
              {filtered.map((p) => (
                <div key={p.id} className="w-full flex flex-col" style={{ flex: "1 1 30%", minWidth: 250 }}>
                  <ProductCard product={p} addToCartLabel={uiStrings["AddToCart"][language as Lang] || "Add to Cart"} wishlistLabel={uiStrings["Wishlist"][language as Lang] || "Wishlist"} />
                  <button className="btn btn-xs btn-ghost-red mt-1" onClick={() => removeFromWishlist(p.id)}>{uiStrings["Remove"][language as Lang] || "Remove"}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
