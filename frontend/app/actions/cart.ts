"use server";

import { cookies } from "next/headers";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

type ServerActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
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

function validateCartItem(item: { id?: number; title?: string; price?: number }) {
  if (!item.id || typeof item.id !== "number" || item.id <= 0) {
    return "Invalid product ID";
  }
  if (!item.title || typeof item.title !== "string" || item.title.trim().length === 0) {
    return "Invalid product title";
  }
  if (item.price === undefined || typeof item.price !== "number" || item.price < 0) {
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
}): Promise<ServerActionResult> {
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
      return { success: false, error: data.error || "Failed to add to cart" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch {
    return { success: false, error: "Cart service unavailable" };
  }
}

export async function removeFromCart(productId: number): Promise<ServerActionResult> {
  if (!productId || typeof productId !== "number" || productId <= 0) {
    return { success: false, error: "Invalid product ID" };
  }

  try {
    const res = await goBackendFetch(`/api/cart/${productId}`, { method: "DELETE" });
    if (!res.ok) {
      return { success: false, error: "Failed to remove from cart" };
    }
    const data = await res.json();
    return { success: true, data };
  } catch {
    return { success: false, error: "Cart service unavailable" };
  }
}

export async function updateCartQuantity(productId: number, quantity: number): Promise<ServerActionResult> {
  if (!productId || typeof productId !== "number" || productId <= 0) {
    return { success: false, error: "Invalid product ID" };
  }
  if (typeof quantity !== "number" || quantity < 0) {
    return { success: false, error: "Invalid quantity" };
  }

  if (quantity <= 0) {
    return removeFromCart(productId);
  }

  try {
    const res = await goBackendFetch(`/api/cart/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ quantity }),
    });
    if (!res.ok) {
      return { success: false, error: "Failed to update quantity" };
    }
    const data = await res.json();
    return { success: true, data };
  } catch {
    return { success: false, error: "Cart service unavailable" };
  }
}

export async function clearCart(): Promise<ServerActionResult> {
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

export async function getCart(): Promise<ServerActionResult> {
  try {
    const res = await goBackendFetch("/api/cart");
    if (!res.ok) {
      return { success: false, error: "Failed to fetch cart" };
    }
    const data = await res.json();
    return { success: true, data };
  } catch {
    return { success: false, error: "Cart service unavailable" };
  }
}
