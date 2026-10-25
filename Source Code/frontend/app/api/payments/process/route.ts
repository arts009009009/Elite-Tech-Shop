import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jsonBadRequest, jsonServerError, jsonUnauthorized } from "@/lib/auth-middleware";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

const STRIPE_CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD"];

type BackendOrder = {
  id?: string;
  total?: number;
  currency?: string;
  status?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { currency, paymentMethodId, orderId } = body;

    // The amount is NEVER taken from the client: it is loaded from the
    // order stored server-side, so prices cannot be manipulated.
    const cookieStore = await cookies();
    const session = cookieStore.get("user_session")?.value;
    if (!session) {
      return jsonUnauthorized("Please login to process a payment");
    }

    if (!orderId || typeof orderId !== "string") {
      return jsonBadRequest("Order ID is required");
    }

    const normalizedOrderId = orderId.trim();
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(normalizedOrderId)) {
      return jsonBadRequest("Invalid order ID format");
    }

    const orderRes = await fetch(
      `${GO_BACKEND}/api/orders/${encodeURIComponent(normalizedOrderId)}`,
      {
        headers: { Cookie: `user_session=${session}` },
        cache: "no-store",
      }
    );

    if (orderRes.status === 404) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!orderRes.ok) {
      return jsonServerError("Order service unavailable");
    }

    const order = (await orderRes.json()) as BackendOrder;
    const amount = order.total;
    const orderCurrency = (order.currency || currency || "USD").toUpperCase();

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return jsonBadRequest("Invalid payment amount");
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (STRIPE_SECRET_KEY) {
      if (!STRIPE_CURRENCIES.includes(orderCurrency)) {
        return jsonBadRequest(
          `Unsupported currency. Supported: ${STRIPE_CURRENCIES.join(", ")}`
        );
      }

      const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          amount: String(Math.round(amount * 100)),
          currency: orderCurrency.toLowerCase(),
          "metadata[orderId]": normalizedOrderId,
          ...(paymentMethodId ? { "payment_method": paymentMethodId } : {}),
          automatic_payment_methods: "enabled",
        }),
      });

      if (!stripeRes.ok) {
        const err = await stripeRes.json();
        return NextResponse.json(
          { error: err.error?.message || "Payment processing failed" },
          { status: 402 }
        );
      }

      const paymentIntent = await stripeRes.json();
      return NextResponse.json({
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      });
    }

    // Demo mode when no Stripe key: mark the order paid and verify the
    // backend actually accepted the update instead of swallowing failures.
    const demoPaymentId = `demo_pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const orderUpdateUrl = new URL(
      `/api/orders/${encodeURIComponent(normalizedOrderId)}`,
      GO_BACKEND
    );
    const updateRes = await fetch(orderUpdateUrl.toString(), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `user_session=${session}`,
      },
      body: JSON.stringify({ status: "paid", payment_id: demoPaymentId }),
    });

    if (!updateRes.ok) {
      const data = await updateRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: (data as { error?: string }).error || "Failed to confirm payment" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      paymentIntentId: demoPaymentId,
      status: "succeeded",
      demo: true,
    });
  } catch {
    return jsonServerError("Payment service unavailable");
  }
}
