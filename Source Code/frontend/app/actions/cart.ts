"use server";

import { cookies } from "next/headers";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

type ServerActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Shape returned by the Go backend (snake_case).
type BackendCartItem = {
  product_id?: number;
  quantity?: number;
  price?: number;
  name?: string;
  image?: string;
  currency?: string;
};

// Shape the frontend contexts/pages work with.
type NormalizedCartItem = {
  id: number;
  title: string;
  price: number;
  quantity: number;
  image: string;
  currency: string;
};

const GUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Maps a backend cart item to the frontend shape, tolerating malformed data
// (NaN prices, missing ids) instead of letting it corrupt cart state.
function normalizeCartItem(item: BackendCartItem): NormalizedCartItem | null {
  const id = Number(item?.product_id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const price = Number(item?.price);
  const quantity = Math.trunc(Number(item?.quantity) || 1);
  return {
    id,
    title: typeof item?.name === "string" ? item.name : "",
    price: Number.isFinite(price) && price >= 0 ? price : 0,
    quantity: Math.min(999, Math.max(1, quantity)),
    image: typeof item?.image === "string" ? item.image : "",
    currency: typeof item?.currency === "string" && item.currency ? item.currency : "USD",
  };
}

function normalizeCart(data: unknown): NormalizedCartItem[] {
  if (!Array.isArray(data)) return [];
  return data
    .map((item) => normalizeCartItem(item as BackendCartItem))
    .filter((item): item is NormalizedCartItem => item !== null);
}

// Stable per-browser guest identity so anonymous carts are not shared
// between all visitors (the backend keys guest carts by this id).
async function ensureGuestId(): Promise<string | null> {
  const cookieStore = await cookies();
  const existing = cookieStore.get("guest_id")?.value;
  if (existing && GUEST_ID_RE.test(existing)) return existing;
  const guestId = crypto.randomUUID();
  cookieStore.set("guest_id", guestId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return guestId;
}

async function goBackendFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const cookieStore = await cookies();
  const session = cookieStore.get("user_session")?.value;
  const guestId = session ? null : await ensureGuestId();

  return fetch(`${GO_BACKEND}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(session ? { Cookie: `user_session=${session}` } : {}),
      ...(guestId ? { "X-Guest-Id": guestId } : {}),
      ...options.headers,
    },
  });
}

function validateCartItem(item: { id?: number; title?: string; price?: number }) {
  if (!item.id || typeof item.id !== "number" || !Number.isInteger(item.id) || item.id <= 0) {
    return "Invalid product ID";
  }
  if (!item.title || typeof item.title !== "string" || item.title.trim().length === 0) {
    return "Invalid product title";
  }
  if (typeof item.price !== "number" || !Number.isFinite(item.price) || item.price < 0) {
    return "Invalid product price";
  }
  return null;
}

export async function addToCart(product: {
  id: number;
  title: string;
  price: number;
  currency: string;
  image?: string;
}): Promise<ServerActionResult<NormalizedCartItem[]>> {
  const validationError = validateCartItem(product);
  if (validationError) {
    return { success: false, error: validationError };
  }

  try {
    const res = await goBackendFetch("/api/cart", {
      method: "POST",
      body: JSON.stringify({
        product_id: product.id,
        quantity: 1,
        price: product.price,
        name: product.title,
        image: product.image || "",
        currency: product.currency,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: (data as { error?: string }).error || "Failed to add to cart" };
    }

    const data = await res.json();
    return { success: true, data: normalizeCart(data) };
  } catch {
    return { success: false, error: "Cart service unavailable" };
  }
}

export async function removeFromCart(productId: number): Promise<ServerActionResult<NormalizedCartItem[]>> {
  if (!productId || typeof productId !== "number" || !Number.isInteger(productId) || productId <= 0) {
    return { success: false, error: "Invalid product ID" };
  }

  try {
    const res = await goBackendFetch(`/api/cart/${productId}`, { method: "DELETE" });
    if (!res.ok) {
      return { success: false, error: "Failed to remove from cart" };
    }
    const data = await res.json();
    return { success: true, data: normalizeCart(data) };
  } catch {
    return { success: false, error: "Cart service unavailable" };
  }
}

export async function updateCartQuantity(productId: number, quantity: number): Promise<ServerActionResult<NormalizedCartItem[]>> {
  if (!productId || typeof productId !== "number" || !Number.isInteger(productId) || productId <= 0) {
    return { success: false, error: "Invalid product ID" };
  }
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 0) {
    return { success: false, error: "Invalid quantity" };
  }

  if (quantity <= 0) {
    return removeFromCart(productId);
  }

  try {
    const res = await goBackendFetch(`/api/cart/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity: Math.min(999, Math.trunc(quantity)) }),
    });
    if (!res.ok) {
      return { success: false, error: "Failed to update quantity" };
    }
    const data = await res.json();
    return { success: true, data: normalizeCart(data) };
  } catch {
    return { success: false, error: "Cart service unavailable" };
  }
}

export async function clearCart(): Promise<ServerActionResult<NormalizedCartItem[]>> {
  try {
    const res = await goBackendFetch("/api/cart", { method: "DELETE" });
    if (!res.ok) {
      return { success: false, error: "Failed to clear cart" };
    }
    return { success: true, data: [] };
  } catch {
    return { success: false, error: "Cart service unavailable" };
  }
}

export async function getCart(): Promise<ServerActionResult<NormalizedCartItem[]>> {
  try {
    const res = await goBackendFetch("/api/cart");
    if (!res.ok) {
      return { success: false, error: "Failed to fetch cart" };
    }
    const data = await res.json();
    return { success: true, data: normalizeCart(data) };
  } catch {
    return { success: false, error: "Cart service unavailable" };
  }
}
