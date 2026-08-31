"use client";
import { useCallback, useMemo, memo } from "react";
import { useRouter } from "next/navigation";
import { useCart, type Product } from "@/context/CartContext";
import { useUser } from "@/context/UserContext";
import { useLanguage } from "@/context/LanguageContext";
import { useThemeCustomizer } from "@/context/ThemeCustomizerContext";
import uiStringsJson from "@/data/navbar-translate.json";
import { formatCurrency } from "@/lib/utils";
import OptimizedImage from "@/components/OptimizedImage";

const uiStrings = uiStringsJson as Record<string, Record<string, string>>;

type Props = { product: Product; addToCartLabel: string; wishlistLabel: string };

const COMPARE_KEY = "compare_slots";

function ProductCardComponent({ product, addToCartLabel, wishlistLabel }: Props) {
  const { addToCart } = useCart();
  const { user } = useUser();
  const { language } = useLanguage();
  const { designSystem } = useThemeCustomizer();
  const router = useRouter();
  const username = user?.username ?? null;
  const ui = useCallback((key: string) => uiStrings[key]?.[language] ?? key, [language]);
  const isClassic = designSystem === "classic";

  const addToCompare = useCallback(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]") as (number | Product)[];
      const ids = saved.map((entry) => (typeof entry === "number" ? entry : entry.id));
      if (!ids.includes(product.id)) {
        if (ids.length >= 3) ids.shift();
        localStorage.setItem(COMPARE_KEY, JSON.stringify([...ids, product.id]));
        window.dispatchEvent(new CustomEvent("notify", { detail: uiStrings["AddedToCompare"]?.[language] ?? "Added to compare!" }));
      }
      router.push("/compare");
    } catch {
      window.dispatchEvent(new CustomEvent("notify", { detail: uiStrings["CompareFailed"]?.[language] ?? "Failed to add to compare." }));
    }
  }, [product, router, language]);

  const addToWishlist = useCallback(() => {
    if (!username) {
      window.dispatchEvent(new CustomEvent("notify", { detail: "Please login to add to wishlist!" }));
      return;
    }
    try {
      const key = `wishlist_${username}`;
      const saved = localStorage.getItem(key);
      const parsed: number[] = saved ? JSON.parse(saved) : [];
      if (!parsed.includes(product.id)) {
        localStorage.setItem(key, JSON.stringify([...parsed, product.id]));
        window.dispatchEvent(new CustomEvent("notify", { detail: wishlistLabel }));
      }
    } catch (err) {
      console.error("Failed to add to wishlist:", err);
      window.dispatchEvent(new CustomEvent("notify", { detail: "Failed to add to wishlist. Please try again." }));
    }
  }, [username, product.id, wishlistLabel]);

  const formattedPrice = useMemo(() => formatCurrency(product.price, product.currency), [product.price, product.currency]);

  const cardStyle = isClassic
    ? { display: "flex" as const, flexDirection: "column" as const, height: "100%", border: "1px solid var(--border, #4a0080)", borderRadius: 8, background: "var(--bg, rgba(26,0,48,0.85))", boxShadow: "0 0 12px rgba(160,32,240,0.15)" }
    : { display: "flex" as const, flexDirection: "column" as const, height: "100%", border: "1px solid var(--v2-border, #2d3748)", borderRadius: 12, background: "var(--v2-panel, rgba(10,10,15,0.95))" };

  const priceColor = isClassic ? "#39FF14" : "var(--v2-green, #39FF14)";
  const cartBtnStyle = isClassic
    ? { padding: "4px 12px", fontSize: 14, border: "1px solid var(--accent, #A020F0)", background: "var(--accent, #A020F0)", color: "#fff", borderRadius: 6, cursor: "pointer" as const, fontWeight: 500 }
    : { padding: "4px 12px", fontSize: 14, border: "1px solid var(--accent, #00d4ff)", background: "var(--accent, #00d4ff)", color: "#0a0a0f", borderRadius: 8, cursor: "pointer" as const, fontWeight: 500 };
  const wishBtnStyle = isClassic
    ? { padding: "4px 12px", fontSize: 14, border: "1px solid var(--accent, #A020F0)", background: "transparent", color: "var(--accent, #A020F0)", borderRadius: 6, cursor: "pointer" as const }
    : { padding: "4px 12px", fontSize: 14, border: "1px solid var(--accent, #00d4ff)", background: "transparent", color: "var(--accent, #00d4ff)", borderRadius: 8, cursor: "pointer" as const };

  return (
    <div className={isClassic ? "contain-content" : "hover-lift contain-content"} style={cardStyle}>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, flex: 1 }}>
          {product.image && (
            <div style={{ width: "100%", height: 128, borderRadius: 8, overflow: "hidden" }}>
              <OptimizedImage
                src={product.image}
                alt={product.title}
                width={300}
                height={128}
                style={{ objectFit: "cover", width: "100%", height: "100%" }}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              />
            </div>
          )}
          <p style={{ fontWeight: 700, fontSize: 16, margin: 0, color: "var(--v2-text, #ffffff)" }}>{product.title}</p>
          <p className={isClassic ? "" : "animate-neon-pulse"} style={{ color: priceColor, fontWeight: 600, margin: 0, textShadow: isClassic ? "none" : undefined }}>{formattedPrice}</p>
          <div style={{ display: "flex", flexDirection: "row", gap: 8, width: "100%", marginTop: "auto" }}>
            <button
              onClick={() => addToCart(product)}
              style={cartBtnStyle}
            >
              {addToCartLabel}
            </button>
            <button
              onClick={addToWishlist}
              style={wishBtnStyle}
            >
              {wishlistLabel}
            </button>
            <button
              onClick={addToCompare}
              style={{
                padding: "4px 8px",
                fontSize: 12,
                border: `1px solid ${isClassic ? "var(--accent, #A020F0)" : "#A020F0"}`,
                background: "transparent",
                color: isClassic ? "var(--accent, #A020F0)" : "#A020F0",
                borderRadius: 6,
                cursor: "pointer",
              }}
              title={ui("Compare")}
            >
              vs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ProductCardComponent);
