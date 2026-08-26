"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import CompareTable from "@/components/CompareTable";
import productTranslations from "@/data/products.json";
import uiStringsJson from "@/data/navbar-translate.json";
import { useLanguage } from "@/context/LanguageContext";
import { apiFetch } from "@/lib/api-fetch";

const uiStrings = uiStringsJson as Record<string, Record<string, string>>;

type Product = { id: number; title: string; price: number; currency: string; category?: string; description?: string; image?: string; specs?: { name: string; value: string }[] };
type RawProduct = {
  id: number;
  category?: string;
  image?: string;
  en: { title: string; price: number; currency: string; description?: string; specs?: { name: string; value: string }[] };
};
const STORAGE_KEY = "compare_slots";

function loadCompare(): number[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return raw.map((entry: number | Product) => (typeof entry === "number" ? entry : entry.id)).filter((id: unknown) => typeof id === "number");
  } catch { return []; }
}

function saveCompare(ids: number[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch {}
}

export default function ComparePage() {
  const { language } = useLanguage();
  const [ids, setIds] = useState<number[]>(() => loadCompare());
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [allProducts, setAllProducts] = useState<Product[]>(() =>
    (productTranslations.products as RawProduct[]).map((p) => {
      const locale = (p as unknown as Record<string, { title: string; price: number; currency: string; description?: string; specs?: { name: string; value: string }[] }>)[language] ?? p.en;
      return {
        id: p.id,
        title: locale.title,
        price: locale.price,
        currency: locale.currency,
        category: p.category ?? "",
        description: locale.description ?? "",
        specs: locale.specs ?? [],
        image: p.image ?? "",
      };
    })
  );

  const ui = useCallback((key: string) => uiStrings[key]?.[language] ?? key, [language]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<{ products: Product[]; total: number }>(`/api/products?lang=${language}`, { timeout: 5000, retries: 1, fallback: null });
        if (!cancelled && data?.products) setAllProducts(data.products);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [language]);

  useEffect(() => {
    const handler = () => setIds(loadCompare());
    window.addEventListener("compare-updated", handler);
    return () => window.removeEventListener("compare-updated", handler);
  }, []);

  const items = useMemo<Product[]>(
    () => ids.map((id) => allProducts.find((p) => p.id === id)).filter(Boolean) as Product[],
    [ids, allProducts]
  );

  const removeItem = useCallback((id: number) => {
    setIds((prev) => {
      const next = prev.filter((p) => p !== id);
      saveCompare(next);
      window.dispatchEvent(new CustomEvent("compare-updated"));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setIds([]);
    saveCompare([]);
    window.dispatchEvent(new CustomEvent("compare-updated"));
  }, []);

  const addProduct = useCallback((id: number) => {
    if (!allProducts.some((p) => p.id === id)) return;
    setIds((prev) => {
      if (prev.some((p) => p === id) || prev.length >= 3) return prev;
      const next = [...prev, id];
      saveCompare(next);
      window.dispatchEvent(new CustomEvent("compare-updated"));
      return next;
    });
    setSelectedId("");
    window.dispatchEvent(new CustomEvent("notify", { detail: uiStrings["AddedToCompare"]?.[language] ?? "Added to compare!" }));
  }, [allProducts, language]);

  const addableProducts = allProducts.filter((p) => !ids.some((i) => i === p.id));

  return (
    <>
      <Navbar />
      <div className="container" style={{ maxWidth: 920, paddingTop: 24, paddingBottom: 80 }}>
        <div className="page-card">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="mb-0">{ui("CompareProducts")} ({items.length}/3)</h2>
            {items.length > 0 && (
              <button className="btn btn-sm btn-outline-red" onClick={clearAll}>{ui("ClearAll")}</button>
            )}
          </div>

          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <select
              className="select"
              value={selectedId}
              onChange={(e) => e.target.value && addProduct(Number(e.target.value))}
              disabled={items.length >= 3}
              aria-label={ui("Compare")}
            >
              <option value="">
                {items.length >= 3 ? ui("CompareListFull") : ui("AddProductToCompare")}
              </option>
              {addableProducts.map((p) => (
                <option key={p.id} value={p.id}>{p.title} — {p.price} {p.currency}</option>
              ))}
            </select>
            {items.length >= 3 && (
              <span style={{ fontSize: 12, opacity: 0.6 }}>{ui("RemoveOneToAdd")}</span>
            )}
          </div>

          {items.length === 0 ? (
            <p style={{ opacity: 0.6 }}>
              {ui("NoProductsToCompare")}
            </p>
          ) : (
            <>
              <div className="flex items-stretch gap-4 flex-wrap mb-4">
                {items.map((p) => (
                  <div key={p.id} className="card" style={{ flex: "1 1 200px", minWidth: 180, display: "flex", flexDirection: "column", gap: 8, padding: 16 }}>
                    <p className="font-bold" style={{ margin: 0, fontSize: 14 }}>{p.title}</p>
                    <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#39FF14" }}>{formatPrice(p.price, p.currency)}</p>
                    {p.category && <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>{p.category}</p>}
                    <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                      <Link href={`/product/${p.id}`} className="btn btn-xs btn-outline-brand" style={{ textDecoration: "none" }}>{ui("View")}</Link>
                      <button className="btn btn-xs btn-ghost-red" onClick={() => removeItem(p.id)}>{ui("Remove")}</button>
                    </div>
                  </div>
                ))}
              </div>
              <CompareTable products={items} />
            </>
          )}
        </div>
      </div>
    </>
  );

  function formatPrice(price: number, currency: string) {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format(price);
  }
}
