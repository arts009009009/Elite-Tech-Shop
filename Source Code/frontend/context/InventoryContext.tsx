"use client";
import { createContext, useState, useCallback, useEffect, useContext, useMemo, useRef } from "react";
import type { ReactNode } from "react";

type StockEntry = { productId: number; quantity: number; lowStockThreshold: number; lastUpdated: string };
type InventoryState = {
  stock: Record<number, StockEntry>;
  getStock: (productId: number) => StockEntry;
  isInStock: (productId: number, requested?: number) => boolean;
  deductStock: (productId: number, quantity: number) => boolean;
  restock: (productId: number, quantity: number) => void;
  setThreshold: (productId: number, threshold: number) => void;
  lowStockItems: StockEntry[];
  initializeStock: (productIds: number[]) => void;
};

export const InventoryContext = createContext<InventoryState | null>(null);
const DEFAULT_QUANTITY = 25;
const DEFAULT_THRESHOLD = 5;

function loadStock(): Record<number, StockEntry> {
  try { return JSON.parse(localStorage.getItem("inventory_stock") || "{}"); }
  catch { return {}; }
}
function saveStock(stock: Record<number, StockEntry>) { try { localStorage.setItem("inventory_stock", JSON.stringify(stock)); } catch {} }

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [stock, setStock] = useState<Record<number, StockEntry>>({});
  // Mirror of the committed state so deductStock can synchronously compute and
  // return a real result without reading localStorage during render.
  const stockRef = useRef(stock);
  // localStorage is unavailable during SSR/prerender, so persistence is
  // deferred until after hydration (SSR-safe pattern).
  const hydratedRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load persisted stock after mount
    const loaded = loadStock();
    if (Object.keys(loaded).length > 0) setStock(loaded);
  }, []);

  useEffect(() => { stockRef.current = stock; }, [stock]);
  useEffect(() => { if (hydratedRef.current) saveStock(stock); }, [stock]);
  // Declared after the save effect: on the mount pass the save effect sees the
  // flag still false, so defaults never overwrite the stored inventory; it
  // flips before any post-hydration change can re-run the save effect.
  useEffect(() => { hydratedRef.current = true; }, []);

  const initializeStock = useCallback((productIds: number[]) => {
    setStock((prev) => {
      const updated = { ...prev };
      for (const id of productIds) {
        if (!updated[id]) {
          updated[id] = { productId: id, quantity: DEFAULT_QUANTITY, lowStockThreshold: DEFAULT_THRESHOLD, lastUpdated: new Date().toISOString() };
        }
      }
      return updated;
    });
  }, []);

  const getStock = useCallback((productId: number): StockEntry => stock[productId] || { productId, quantity: DEFAULT_QUANTITY, lowStockThreshold: DEFAULT_THRESHOLD, lastUpdated: new Date().toISOString() }, [stock]);

  const isInStock = useCallback((productId: number, requested: number = 1): boolean => {
    const entry = stock[productId];
    return entry ? entry.quantity >= requested : true;
  }, [stock]);

  const deductStock = useCallback((productId: number, quantity: number): boolean => {
    const entry = stockRef.current[productId];
    if (!entry || entry.quantity < quantity) return false;
    const newQty = entry.quantity - quantity;
    const now = new Date().toISOString();
    // Optimistically mirror the result so repeated calls in the same tick see
    // consistent stock; the state itself is updated with a pure updater.
    stockRef.current = { ...stockRef.current, [productId]: { ...entry, quantity: newQty, lastUpdated: now } };
    setStock((prev) => {
      const cur = prev[productId];
      if (!cur || cur.quantity < quantity) return prev;
      return { ...prev, [productId]: { ...cur, quantity: cur.quantity - quantity, lastUpdated: now } };
    });
    // Notify outside the updater so StrictMode can't double-fire these toasts.
    if (newQty <= entry.lowStockThreshold && newQty > 0) {
      window.dispatchEvent(new CustomEvent("notify", { detail: `Low stock alert: Product #${productId} has only ${newQty} left!` }));
    }
    if (newQty === 0) {
      window.dispatchEvent(new CustomEvent("notify", { detail: `Product #${productId} is now out of stock!` }));
    }
    return true;
  }, []);

  const restock = useCallback((productId: number, quantity: number) => {
    setStock((prev) => {
      const entry = prev[productId];
      return { ...prev, [productId]: { ...(entry || { productId, lowStockThreshold: DEFAULT_THRESHOLD }), quantity: (entry?.quantity || 0) + quantity, lastUpdated: new Date().toISOString() } };
    });
  }, []);

  const setThreshold = useCallback((productId: number, threshold: number) => {
    setStock((prev) => {
      const entry = prev[productId];
      if (!entry) return prev;
      return { ...prev, [productId]: { ...entry, lowStockThreshold: threshold } };
    });
  }, []);

  const lowStockItems = useMemo(
    () => Object.values(stock).filter((entry) => entry.quantity > 0 && entry.quantity <= entry.lowStockThreshold),
    [stock]
  );

  return (
    <InventoryContext.Provider value={useMemo(() => ({ stock, getStock, isInStock, deductStock, restock, setThreshold, lowStockItems, initializeStock }), [stock, getStock, isInStock, deductStock, restock, setThreshold, lowStockItems, initializeStock])}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
}
