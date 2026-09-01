import { NextResponse } from "next/server";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const ORDER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function isSafeOrderId(value: unknown): value is string {
  return typeof value === "string" && ORDER_ID_PATTERN.test(value);
}

export async function POST(request: Request) {
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ received: true, demo: true });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // In production, verify Stripe signature here
    // const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);

    const event = JSON.parse(body);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (isSafeOrderId(orderId)) {
          const orderUrl = new URL(
            `/api/orders/${encodeURIComponent(orderId)}`,
            GO_BACKEND
          ).toString();

          await fetch(orderUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "paid",
              paymentId: paymentIntent.id,
            }),
          });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const failedIntent = event.data.object;
        const failOrderId = failedIntent.metadata?.orderId;

        if (isSafeOrderId(failOrderId)) {
          const failOrderUrl = new URL(
            `/api/orders/${encodeURIComponent(failOrderId)}`,
            GO_BACKEND
          ).toString();

          await fetch(failOrderUrl, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "payment_failed" }),
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
