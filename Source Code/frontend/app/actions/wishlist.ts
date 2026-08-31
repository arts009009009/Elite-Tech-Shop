"use server";

import { cookies } from "next/headers";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

type ServerActionResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

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

export async function addToWishlist(productId: number): Promise<ServerActionResult> {
  if (!productId || typeof productId !== "number" || productId <= 0) {
    return { success: false, error: "Invalid product ID" };
  }

  const username = await getUserFromSession();
  if (!username) {
    return { success: false, error: "Please login to add to wishlist" };
  }

  try {
    const res = await fetch(`${GO_BACKEND}/api/wishlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || "Failed to add to wishlist" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch {
    return { success: false, error: "Wishlist service unavailable" };
  }
}

export async function removeFromWishlist(productId: number): Promise<ServerActionResult> {
  if (!productId || typeof productId !== "number" || productId <= 0) {
    return { success: false, error: "Invalid product ID" };
  }

  try {
    const res = await fetch(`${GO_BACKEND}/api/wishlist/${productId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      return { success: false, error: "Failed to remove from wishlist" };
    }

    const data = await res.json();
    return { success: true, data };
  } catch {
    return { success: false, error: "Wishlist service unavailable" };
  }
}

export async function getWishlist(): Promise<ServerActionResult> {
  try {
    const res = await fetch(`${GO_BACKEND}/api/wishlist`);
    if (!res.ok) {
      return { success: false, error: "Failed to fetch wishlist" };
    }
    const data = await res.json();
    return { success: true, data };
  } catch {
    return { success: false, error: "Wishlist service unavailable" };
  }
}
