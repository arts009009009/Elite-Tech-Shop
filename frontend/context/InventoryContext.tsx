"use client";
import { createContext, useState, useCallback, useEffect, useContext, useMemo } from "react";
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
  const [stock, setStock] = useState<Record<number, StockEntry>>(loadStock);
  useEffect(() => { saveStock(stock); }, [stock]);

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
    let success = false;
    setStock((prev) => {
      const entry = prev[productId];
      if (!entry || entry.quantity < quantity) return prev;
      success = true;
      const newQty = entry.quantity - quantity;
      const updated = { ...prev, [productId]: { ...entry, quantity: newQty, lastUpdated: new Date().toISOString() } };
      if (newQty <= updated[productId].lowStockThreshold && newQty > 0) {
        window.dispatchEvent(new CustomEvent("notify", { detail: `Low stock alert: Product #${productId} has only ${newQty} left!` }));
      }
      if (newQty === 0) {
        window.dispatchEvent(new CustomEvent("notify", { detail: `Product #${productId} is now out of stock!` }));
      }
      return updated;
    });
    return success;
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

  const lowStockItems = Object.values(stock).filter((entry) => entry.quantity > 0 && entry.quantity <= entry.lowStockThreshold);

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
