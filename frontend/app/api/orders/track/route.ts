import { NextResponse } from "next/server";
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
    const res = await fetch(`${GO_BACKEND}/api/orders/${orderId}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return jsonServerError("Order service unavailable");
  }
}
