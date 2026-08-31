import { NextResponse } from "next/server";
import { jsonBadRequest, jsonServerError } from "@/lib/auth-middleware";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, currency, paymentMethodId, orderId } = body;

    if (typeof amount !== "number" || amount <= 0) {
      return jsonBadRequest("Invalid payment amount");
    }

    if (!currency || typeof currency !== "string") {
      return jsonBadRequest("Currency is required");
    }

    const supportedCurrencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      return jsonBadRequest(`Unsupported currency. Supported: ${supportedCurrencies.join(", ")}`);
    }

    if (!orderId || typeof orderId !== "string") {
      return jsonBadRequest("Order ID is required");
    }

    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (STRIPE_SECRET_KEY) {
      const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          amount: String(Math.round(amount * 100)),
          currency: currency.toLowerCase(),
          "metadata[orderId]": orderId,
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

    // Demo mode when no Stripe key
    const demoPaymentId = `demo_pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      await fetch(`${GO_BACKEND}/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "paid", paymentId: demoPaymentId }),
      });
    } catch {}

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
