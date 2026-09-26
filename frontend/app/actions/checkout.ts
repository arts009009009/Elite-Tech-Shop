"use server";

import { cookies } from "next/headers";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

type ServerActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

type CartItem = {
  id: number;
  title: string;
  price: number;
  currency: string;
  quantity: number;
  image?: string;
};

async function goBackendFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const cookieStore = await cookies();
  const session = cookieStore.get("user_session")?.value;

  return fetch(`${GO_BACKEND}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Cookie: `user_session=${session}` } : {}),
      ...options.headers,
    },
  });
}

async function getUserFromSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("user_session")?.value;
  if (!session) return null;

  try {
    const res = await fetch(`${GO_BACKEND}/api/auth/me`, {
      headers: { Cookie: `user_session=${session}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.username || data.user?.username || null;
  } catch {
    return null;
  }
}

export async function validateCheckout(cart: CartItem[]): Promise<ServerActionResult<{ valid: boolean; errors: string[] }>> {
  const errors: string[] = [];

  if (!cart || cart.length === 0) {
    return { success: true, data: { valid: false, errors: ["Cart is empty"] } };
  }

  for (const item of cart) {
    if (!item.id || item.id <= 0) errors.push(`Invalid product ID for "${item.title}"`);
    if (!item.title || item.title.trim().length === 0) errors.push("Product title is required");
    if (typeof item.price !== "number" || item.price < 0) errors.push(`Invalid price for "${item.title}"`);
    if (!item.quantity || item.quantity <= 0) errors.push(`Invalid quantity for "${item.title}"`);
  }

  return {
    success: true,
    data: { valid: errors.length === 0, errors },
  };
}

export async function applyDiscount(code: string, subtotal: number): Promise<ServerActionResult<{ code: string; discountAmount: number; label: string }>> {
  if (!code || typeof code !== "string" || code.trim().length === 0) {
    return { success: false, error: "Discount code is required" };
  }

  if (typeof subtotal !== "number" || subtotal < 0) {
    return { success: false, error: "Invalid subtotal" };
  }

  const sanitizedCode = code.trim().toUpperCase();

  try {
    const res = await goBackendFetch("/api/discounts/validate", {
      method: "POST",
      body: JSON.stringify({ code: sanitizedCode, subtotal }),
    });

    if (!res.ok) {
      return { success: false, error: "Invalid or expired discount code" };
    }

    const data = await res.json();
    return {
      success: true,
      data: {
        code: sanitizedCode,
        discountAmount: data.discountAmount || 0,
        label: data.label || `${sanitizedCode} discount`,
      },
    };
  } catch {
    return { success: false, error: "Discount service unavailable" };
  }
}

export async function placeOrder(cart: CartItem[], discountAmount = 0): Promise<ServerActionResult<{ id: string; total: number }>> {
  const username = await getUserFromSession();
  if (!username) {
    return { success: false, error: "Please login to place an order" };
  }

  const validation = await validateCheckout(cart);
  if (!validation.success || !validation.data?.valid) {
    return { success: false, error: validation.data?.errors?.join(", ") || "Invalid checkout data" };
  }

  const total = Math.max(0, cart.reduce((sum, item) => sum + item.price * item.quantity, 0) - discountAmount);

  try {
    const res = await goBackendFetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        items: cart,
        total: +total.toFixed(2),
        discount: discountAmount,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || "Failed to place order" };
    }

    const data = await res.json();
    return { success: true, data: { id: data.id, total } };
  } catch {
    return { success: false, error: "Order service unavailable" };
  }
}

export async function trackOrder(orderId: string): Promise<ServerActionResult> {
  if (!orderId || typeof orderId !== "string" || orderId.trim().length === 0) {
    return { success: false, error: "Invalid order ID" };
  }

  try {
    const res = await goBackendFetch(`/api/orders/${orderId.trim()}`);
    if (!res.ok) {
      return { success: false, error: "Order not found" };
    }
    const data = await res.json();
    return { success: true, data };
  } catch {
    return { success: false, error: "Order service unavailable" };
  }
}
