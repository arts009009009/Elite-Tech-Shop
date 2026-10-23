import { test, expect } from "@playwright/test";

/**
 * Contract & security tests for the Next.js API proxy routes.
 * These run against the dev server directly (no browser needed).
 */
test.describe("API security contract", () => {
  test.setTimeout(120000);

  test("payments/process rejects unauthenticated calls", async ({ request }) => {
    const res = await request.post("/api/payments/process", {
      data: { amount: 100, currency: "usd" },
    });
    expect(res.status()).toBe(401);
  });

  test("orders/track requires a session", async ({ request }) => {
    const res = await request.get("/api/orders/track?orderId=123");
    expect(res.status()).toBe(401);
  });

  test("user/profile requires a session", async ({ request }) => {
    const res = await request.get("/api/user/profile");
    expect(res.status()).toBe(401);
  });

  test("revalidate is fail-closed without a valid secret", async ({ request }) => {
    const res = await request.post("/api/revalidate", { data: { secret: "wrong" } });
    // 401 (secret set but wrong) or 503 (secret unset) — never 200.
    expect([401, 503]).toContain(res.status());
  });

  test("stripe webhook rejects unsigned payloads", async ({ request }) => {
    const res = await request.post("/api/payments/webhook", {
      data: { type: "payment_intent.succeeded" },
      headers: { "content-type": "application/json" },
    });
    // 400 (bad signature) or 503 (Stripe not configured) — never 200.
    expect([400, 503]).toContain(res.status());
  });

  test("logout is idempotent when no session exists", async ({ request }) => {
    const res = await request.post("/api/auth/logout");
    expect(res.ok()).toBe(true);
  });

  test("cms products tolerates malformed query params", async ({ request }) => {
    const res = await request.get("/api/cms/products?limit=abc&offset=xyz");
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(Array.isArray(body.products)).toBe(true);
  });
});
