import { test, expect } from "@playwright/test";
import { settle, signup, addFirstProductToCart } from "./helpers";

test.describe("Discount codes", () => {
  test.setTimeout(120000);

  test("available codes panel lists the real backend codes", async ({ page }) => {
    await signup(page, "discuser");
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await settle(page);

    await page.locator("summary", { hasText: "Available codes" }).click();
    // Regression: the panel used to advertise codes the backend rejects.
    await expect(page.locator("text=WELCOME10")).toBeVisible();
  });

  test("valid percentage code applies and updates the total", async ({ page }) => {
    await signup(page, "discvalid");
    await addFirstProductToCart(page);
    await page.locator("nav a", { hasText: "Cart" }).click();
    await settle(page);
    await page.locator("a", { hasText: "Checkout" }).first().click();
    await settle(page);

    await page.locator("input.co-discount-input").fill("WELCOME10");
    await page.locator("button", { hasText: "Apply" }).click();

    await expect(page.locator(".co-discount-success")).toContainText("WELCOME10", { timeout: 15000 });
    await expect(page.locator(".co-discount-success")).toContainText("10% off");
    await expect(page.locator("text=Discount (10% off)")).toBeVisible();
  });

  test("invalid code shows an error and applies nothing", async ({ page }) => {
    await signup(page, "discbad");
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await settle(page);

    await page.locator("input.co-discount-input").fill("BOGUS99");
    await page.locator("button", { hasText: "Apply" }).click();

    await expect(page.locator("text=Invalid or expired code")).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".co-discount-success")).not.toBeVisible();
  });

  test("discounted checkout stores a discounted order total", async ({ page }) => {
    await signup(page, "disctotal");
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await settle(page);

    // Read the subtotal shown in the UI.
    const subtotalText = await page.locator(".co-summary-row").first().locator("span").nth(1).textContent();
    const subtotal = Number((subtotalText || "").replace(/[^0-9.]/g, ""));
    expect(Number.isFinite(subtotal)).toBe(true);

    await page.locator("input.co-discount-input").fill("WELCOME10");
    await page.locator("button", { hasText: "Apply" }).click();
    await expect(page.locator(".co-discount-success")).toContainText("WELCOME10", { timeout: 15000 });

    await page.locator("button", { hasText: "Place Order" }).click();
    await expect(page.locator("h3", { hasText: /Quick Pay — Order/ })).toBeVisible({ timeout: 15000 });

    // Quick Pay charges the SERVER-computed (discounted) total, not the
    // undiscounted subtotal (regression: checkout showed a discounted total
    // but charged the full price).
    const payText = await page.locator("button", { hasText: /^Pay \$/ }).textContent();
    const charged = Number((payText || "").replace(/[^0-9.]/g, ""));
    expect(charged).toBeLessThan(subtotal);
    expect(Math.abs(charged - subtotal * 0.9)).toBeLessThanOrEqual(1);
  });
});
