"use client";
import { createContext, useState, useEffect, useCallback, useContext, useMemo, useRef } from "react";
import type { ReactNode } from "react";
import { goFetch } from "@/lib/goFetch";
import { addToCart as serverAddToCart, removeFromCart as serverRemoveFromCart, updateCartQuantity as serverUpdateQuantity, clearCart as serverClearCart, getCart as serverGetCart } from "@/app/actions/cart";

export type Product = { id: number; title: string; price: number; currency: string; category?: string; description?: string; image?: string };
export type CartItem = Product & { quantity: number };
export type Order = { id: string; items: CartItem[]; total: number; currency: string; date: string; user: string; status?: string; discountCode?: string };

export type PlaceOrderResult = { success: boolean; order?: Order; error?: string };

// Shape returned by the Go backend for orders (snake_case).
type BackendOrder = {
  id?: string;
  items?: Array<{
    product_id?: number;
    name?: string;
    price?: number;
    quantity?: number;
    image?: string;
    currency?: string;
  }>;
  total?: number;
  currency?: string;
  created_at?: string;
  username?: string;
  status?: string;
  discount_code?: string;
};

function normalizeCartItem(item: NonNullable<BackendOrder["items"]>[number]): CartItem | null {
  const id = Number(item?.product_id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const price = Number(item?.price);
  const quantity = Math.trunc(Number(item?.quantity) || 1);
  return {
    id,
    title: typeof item?.name === "string" ? item.name : "",
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    quantity: Math.min(999, Math.max(1, quantity)),
    currency: typeof item?.currency === "string" && item.currency ? item.currency : "USD",
    image: typeof item?.image === "string" ? item.image : "",
  };
}

// Maps a backend order to the frontend Order shape (created_at -> date,
// username -> user), tolerating malformed payloads.
export function normalizeOrder(raw: unknown): Order | null {
  const o = raw as BackendOrder | null;
  if (!o || typeof o.id !== "string" || o.id.length === 0) return null;
  const items = Array.isArray(o.items)
    ? o.items
        .map(normalizeCartItem)
        .filter((item): item is CartItem => item !== null)
    : [];
  const total = Number(o.total);
  return {
    id: o.id,
    items,
    total: Number.isFinite(total) && total >= 0 ? total : 0,
    currency: typeof o.currency === "string" && o.currency ? o.currency : "USD",
    date: typeof o.created_at === "string" ? o.created_at : "",
    user: typeof o.username === "string" ? o.username : "",
    status: typeof o.status === "string" ? o.status : undefined,
    discountCode: typeof o.discount_code === "string" ? o.discount_code : undefined,
  };
}

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, qty: number) => void;
  clearCart: () => void;
  resetCart: () => void;
  applyDiscount: (code: string) => void;
  discountCode: string | null;
  removeDiscount: () => void;
  orders: Order[];
  placeOrder: (username: string, discountCode?: string) => Promise<PlaceOrderResult>;
  loadOrdersForUser: (username: string | null) => void;
  clearAllOrders: () => void;
  removeOrder: (orderId: string) => void;
  markOrderPaid: (orderId: string, paymentId: string) => void;
  cartTotal: number;
  itemCount: number;
};

export const CartContext = createContext<CartContextType | null>(null);

// Monotonic counter: local mutations bump it so a stale in-flight server
// response (e.g. the mount-time getCart) can never overwrite newer state.
function useSyncGuard() {
  const ref = useRef(0);
  return ref;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const syncGuard = useSyncGuard();

  useEffect(() => {
    const guard = syncGuard.current;
    serverGetCart().then((result) => {
      // Ignore if a local cart mutation happened while this was in flight.
      if (guard !== syncGuard.current) return;
      if (result.success && Array.isArray(result.data)) {
        setCart(result.data);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const addToCart = useCallback(async (product: Product) => {
    syncGuard.current += 1;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
    try {
      const result = await serverAddToCart(product);
      if (result.success && Array.isArray(result.data)) {
        setCart(result.data);
      } else if (!result.success) {
        window.dispatchEvent(new CustomEvent("notify", { detail: result.error || "Failed to add to cart." }));
      }
    } catch {}
  }, [syncGuard]);

  const removeFromCart = useCallback(async (id: number) => {
    syncGuard.current += 1;
    setCart(prev => prev.filter(i => i.id !== id));
    try {
      const result = await serverRemoveFromCart(id);
      if (result.success && Array.isArray(result.data)) {
        setCart(result.data);
      }
    } catch {}
  }, [syncGuard]);

  const updateQuantity = useCallback(async (id: number, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    syncGuard.current += 1;
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.min(999, Math.trunc(qty)) } : i));
    try {
      const result = await serverUpdateQuantity(id, qty);
      if (result.success && Array.isArray(result.data)) {
        setCart(result.data);
      } else if (!result.success) {
        window.dispatchEvent(new CustomEvent("notify", { detail: result.error || "Failed to update quantity." }));
      }
    } catch {}
  }, [removeFromCart, syncGuard]);

  const clearCart = useCallback(async () => {
    syncGuard.current += 1;
    setCart([]);
    try { await serverClearCart(); } catch {}
  }, [syncGuard]);

  const resetCart = useCallback(() => { syncGuard.current += 1; setCart([]); }, [syncGuard]);

  const applyDiscount = useCallback((code: string) => {
    setDiscountCode(code.toUpperCase().trim());
  }, []);

  const removeDiscount = useCallback(() => setDiscountCode(null), []);

  const loadOrdersForUser = useCallback(async (username: string | null) => {
    if (!username) { setOrders([]); return; }
    try {
      const res = await goFetch("/api/orders");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setOrders(
        (Array.isArray(data) ? data : [])
          .map(normalizeOrder)
          .filter((order): order is Order => order !== null)
      );
    } catch {
      setOrders([]);
      window.dispatchEvent(new CustomEvent("notify", { detail: "Failed to load orders." }));
    }
  }, []);

  const placeOrder = useCallback(async (username: string, orderDiscountCode?: string): Promise<PlaceOrderResult> => {
    if (!username || cart.length === 0) {
      return { success: false, error: "Your cart is empty." };
    }
    try {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      // Send items in the backend's shape; the backend recomputes the total
      // from its catalog and applies any discount code server-side.
      const items = cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        name: item.title,
        image: item.image || "",
        currency: item.currency,
      }));
      const res = await goFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          total: +total.toFixed(2),
          ...(orderDiscountCode ? { discount_code: orderDiscountCode } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data || typeof data.id !== "string") {
        const error = (data as { error?: string }).error || "Failed to place order.";
        window.dispatchEvent(new CustomEvent("notify", { detail: error }));
        return { success: false, error };
      }
      const order = normalizeOrder(data);
      if (!order) {
        const error = "Received an invalid order response.";
        window.dispatchEvent(new CustomEvent("notify", { detail: error }));
        return { success: false, error };
      }
      setOrders(prev => [...prev, order]);
      syncGuard.current += 1;
      setCart([]);
      window.dispatchEvent(new CustomEvent("notify", { detail: `Order ${order.id} placed!` }));
      return { success: true, order };
    } catch {
      const error = "Failed to place order.";
      window.dispatchEvent(new CustomEvent("notify", { detail: error }));
      return { success: false, error };
    }
  }, [cart, syncGuard]);

  const clearAllOrders = useCallback(async () => {
    setOrders([]);
    try { await goFetch("/api/admin/orders", { method: "DELETE" }); } catch {}
  }, []);

  const removeOrder = useCallback(async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    try { await goFetch(`/api/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" }); } catch {}
  }, []);

  const markOrderPaid = useCallback((orderId: string, paymentId: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: "paid" } : o));
    void paymentId;
  }, []);

  const value = useMemo(() => ({
    cart, addToCart, removeFromCart, updateQuantity, clearCart, resetCart, applyDiscount,
    discountCode, removeDiscount,
    orders, placeOrder, loadOrdersForUser, clearAllOrders, removeOrder, markOrderPaid, cartTotal, itemCount,
  }), [cart, addToCart, removeFromCart, updateQuantity, clearCart, resetCart, applyDiscount, discountCode, removeDiscount, orders, placeOrder, loadOrdersForUser, clearAllOrders, removeOrder, markOrderPaid, cartTotal, itemCount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Stable fallback so consumers outside a provider don't get new function
// identities on every render (which breaks effect dependency arrays).
const FALLBACK_CART_CONTEXT: CartContextType = {
  cart: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  resetCart: () => {},
  applyDiscount: () => {},
  discountCode: null,
  removeDiscount: () => {},
  orders: [],
  placeOrder: async () => ({ success: false, error: "Cart unavailable" }),
  loadOrdersForUser: () => {},
  clearAllOrders: () => {},
  removeOrder: () => {},
  markOrderPaid: () => {},
  cartTotal: 0,
  itemCount: 0,
};

export function useCart() {
  const ctx = useContext(CartContext);
  return ctx ?? FALLBACK_CART_CONTEXT;
}
