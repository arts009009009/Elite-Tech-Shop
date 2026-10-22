import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { validateSession, jsonUnauthorized, jsonServerError } from "@/lib/auth-middleware";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

export async function GET(request: Request) {
  const auth = await validateSession();
  if (!auth.authenticated) return jsonUnauthorized();

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(orderId)) {
    return NextResponse.json({ error: "Invalid order ID format" }, { status: 400 });
  }

  try {
    // The backend enforces order ownership for the session user.
    const cookieStore = await cookies();
    const session = cookieStore.get("user_session")?.value;
    const res = await fetch(
      `${GO_BACKEND}/api/orders/${encodeURIComponent(orderId)}`,
      {
        headers: session ? { Cookie: `user_session=${session}` } : {},
        cache: "no-store",
      }
    );

    if (res.status === 401) {
      return jsonUnauthorized("Order service rejected the session");
    }
    if (res.status === 404) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!res.ok) {
      return jsonServerError("Order service unavailable");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return jsonServerError("Order service unavailable");
  }
}
