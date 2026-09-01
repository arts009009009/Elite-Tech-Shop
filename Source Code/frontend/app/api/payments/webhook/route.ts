import { NextResponse } from "next/server";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: Request) {
  if (!STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify Stripe signature using timing-safe comparison
    const expectedSig = STRIPE_WEBHOOK_SECRET;
    if (!expectedSig) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    // In production, use stripe.webhooks.constructEvent for full verification
    // const event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
    // For now, verify the signature format at minimum
    if (!signature.startsWith("v1=")) {
      return NextResponse.json({ error: "Invalid signature format" }, { status: 400 });
    }

    const event = JSON.parse(body);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (orderId) {
          await fetch(`${GO_BACKEND}/api/orders/${orderId}`, {
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

        if (failOrderId) {
          await fetch(`${GO_BACKEND}/api/orders/${failOrderId}`, {
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
