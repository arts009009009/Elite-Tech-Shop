"use client";
import { createContext, useState, useEffect, useCallback, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { goFetch } from "@/lib/goFetch";
import { addToCart as serverAddToCart, removeFromCart as serverRemoveFromCart, updateCartQuantity as serverUpdateQuantity, clearCart as serverClearCart, getCart as serverGetCart } from "@/app/actions/cart";

export type Product = { id: number; title: string; price: number; currency: string; category?: string; description?: string; image?: string };
export type CartItem = Product & { quantity: number };
export type Order = { id: string; items: CartItem[]; total: number; currency: string; date: string; user: string };

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
  placeOrder: (username: string) => void;
  loadOrdersForUser: (username: string | null) => void;
  clearAllOrders: () => void;
  removeOrder: (orderId: string) => void;
  cartTotal: number;
  itemCount: number;
};

export const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountCode, setDiscountCode] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    serverGetCart().then((result) => {
      if (result.success && Array.isArray(result.data)) {
        setCart(result.data);
      }
    }).catch(() => {});
  }, []);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const addToCart = useCallback(async (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
    try {
      const result = await serverAddToCart(product);
      if (result.success && Array.isArray(result.data)) {
        setCart(result.data);
      }
    } catch {}
  }, []);

  const removeFromCart = useCallback(async (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
    try {
      const result = await serverRemoveFromCart(id);
      if (result.success && Array.isArray(result.data)) {
        setCart(result.data);
      }
    } catch {}
  }, []);

  const updateQuantity = useCallback(async (id: number, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
    try {
      const result = await serverUpdateQuantity(id, qty);
      if (result.success && Array.isArray(result.data)) {
        setCart(result.data);
      }
    } catch {}
  }, [removeFromCart]);

  const clearCart = useCallback(async () => {
    setCart([]);
    try { await serverClearCart(); } catch {}
  }, []);

  const resetCart = useCallback(() => { setCart([]); }, []);

  const applyDiscount = useCallback((code: string) => {
    setDiscountCode(code.toUpperCase().trim());
  }, []);

  const removeDiscount = useCallback(() => setDiscountCode(null), []);

  const loadOrdersForUser = useCallback(async (username: string | null) => {
    if (!username) { setOrders([]); return; }
    try {
      const res = await goFetch("/api/orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch {
      setOrders([]);
      window.dispatchEvent(new CustomEvent("notify", { detail: "Failed to load orders." }));
    }
  }, []);

  const placeOrder = useCallback(async (username: string) => {
    if (!username || cart.length === 0) return;
    try {
      const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const res = await goFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart, total: +total.toFixed(2) }),
      });
      const data = await res.json();
      if (data.id) {
        setOrders(prev => [...prev, data]);
        setCart([]);
        window.dispatchEvent(new CustomEvent("notify", { detail: `Order ${data.id} placed!` }));
      }
    } catch {
      window.dispatchEvent(new CustomEvent("notify", { detail: "Failed to place order." }));
    }
  }, [cart]);

  const clearAllOrders = useCallback(async () => {
    setOrders([]);
    try { await goFetch("/api/admin/orders", { method: "DELETE" }); } catch {}
  }, []);

  const removeOrder = useCallback(async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    try { await goFetch(`/api/orders/${orderId}`, { method: "DELETE" }); } catch {}
  }, []);

  const value = useMemo(() => ({
    cart, addToCart, removeFromCart, updateQuantity, clearCart, resetCart, applyDiscount,
    discountCode, removeDiscount,
    orders, placeOrder, loadOrdersForUser, clearAllOrders, removeOrder, cartTotal, itemCount,
  }), [cart, addToCart, removeFromCart, updateQuantity, clearCart, resetCart, applyDiscount, discountCode, removeDiscount, orders, placeOrder, loadOrdersForUser, clearAllOrders, removeOrder, cartTotal, itemCount]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    return { cart: [], addToCart: () => {}, removeFromCart: () => {}, updateQuantity: () => {}, clearCart: () => {}, resetCart: () => {}, applyDiscount: () => {}, discountCode: null, removeDiscount: () => {}, orders: [], placeOrder: () => {}, loadOrdersForUser: () => {}, clearAllOrders: () => {}, removeOrder: () => {}, cartTotal: 0, itemCount: 0 };
  }
  return ctx;
}
