const GO_URL = process.env.GO_BACKEND_URL || "http://localhost:3003";
const GO_ENABLED =
  process.env.NEXT_PUBLIC_GO_BACKEND_ENABLED === "true" ||
  (process.env.NODE_ENV !== "development" && process.env.NEXT_PUBLIC_GO_BACKEND_ENABLED !== "false");

function unavailableGoResponse(path: string, method: string): Response {
  const pathname = new URL(path, GO_URL).pathname;
  if (method !== "GET" && method !== "HEAD") {
    return Response.json({ error: "Go backend unavailable" }, { status: 503 });
  }

  if (pathname === "/api/auth/me") {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (["/api/cart", "/api/orders", "/api/reviews", "/api/discounts", "/api/wishlist"].includes(pathname)) {
    return Response.json([]);
  }
  if (pathname === "/api/rewards") {
    return Response.json({ points: 0, lifetime: 0, redeemed: {} });
  }
  if (pathname === "/api/recommendations") {
    return Response.json({ recommendations: [] });
  }
  if (pathname === "/api/profile") {
    return Response.json({ display_name: "", avatar: "", bio: "", theme: "" });
  }
  return Response.json({ error: "Go backend unavailable" }, { status: 503 });
}

export async function goFetch(path: string, opts?: RequestInit) {
  if (!GO_ENABLED) return unavailableGoResponse(path, opts?.method?.toUpperCase() ?? "GET");
  const res = await fetch(`${GO_URL}${path}`, { credentials: "include", ...opts });
  return res;
}
