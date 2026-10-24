import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const GO_BACKEND = process.env.GO_BACKEND_URL || "http://localhost:3003";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SIGNATURE_TOLERANCE_SECONDS = 300;

function isValidOrderId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

// Verifies a Stripe-Signature header (t=<ts>,v1=<hmac>) per Stripe's docs:
// HMAC-SHA256 of "<timestamp>.<raw body>" with the webhook secret, compared
// timing-safe against every v1 value, with a replay window on the timestamp.
function verifyStripeSignature(
  body: string,
  header: string,
  secret: string
): boolean {
  const parts = header.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - ts) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  return signatures.some((signature) => {
    if (!/^[0-9a-f]+$/i.test(signature)) return false;
    const candidate = Buffer.from(signature, "hex");
    return (
      candidate.length === expectedBuffer.length &&
      timingSafeEqual(candidate, expectedBuffer)
    );
  });
}

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

    if (!verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;

        if (isValidOrderId(orderId)) {
          const backendUrl = new URL(
            `/api/orders/${encodeURIComponent(orderId)}`,
            GO_BACKEND
          );

          await fetch(backendUrl.toString(), {
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

        if (isValidOrderId(failOrderId)) {
          const backendUrl = new URL(
            `/api/orders/${encodeURIComponent(failOrderId)}`,
            GO_BACKEND
          );

          await fetch(backendUrl.toString(), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              status: "payment_failed",
            }),
          });
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}