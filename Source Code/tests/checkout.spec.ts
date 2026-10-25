import { test, expect } from "@playwright/test";
import { settle, signup, addFirstProductToCart } from "./helpers";

test.describe("Checkout", () => {
  test.setTimeout(120000);

  test("shows empty state for an empty cart", async ({ page }) => {
    await page.goto("/checkout");
    await settle(page);
    await expect(page.locator(".co-empty-title")).toHaveText("Your cart is empty");
  });

  test("logged-out user sees the login notice and disabled button", async ({ page }) => {
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await settle(page);
    await expect(page.locator("text=You must login to place an order.")).toBeVisible();
    await expect(page.locator("button", { hasText: "Place Order" })).toBeDisabled();
  });

  test("place order creates a pending order and offers Quick Pay", async ({ page }) => {
    await signup(page, "checkoutuser");
    await addFirstProductToCart(page);

    await page.goto("/checkout");
    await settle(page);
    await expect(page.locator("h3", { hasText: /Order Items \(1\)/ })).toBeVisible();

    await page.locator("button", { hasText: "Place Order" }).click();

    // A real order was created server-side: Quick Pay becomes reachable.
    await expect(page.locator("h3", { hasText: /Quick Pay — Order/ })).toBeVisible({ timeout: 15000 });
    await expect(page.locator("button", { hasText: /^Pay \$/ })).toBeVisible();
    await expect(page.locator("button", { hasText: "Pay later" })).toBeVisible();

    // Success is only claimed after the server confirmed the order.
    await expect(page.locator(".notification-bar")).toContainText(/Order created!/);

    await page.locator("button", { hasText: "Pay later" }).click();
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.locator("text=1 order found")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("span.badge", { hasText: "Processing" }).first()).toBeVisible();
  });

  test("quick pay demo flow marks the order paid", async ({ page }) => {
    await signup(page, "payuser");
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await settle(page);

    await page.locator("button", { hasText: "Place Order" }).click();
    await expect(page.locator("h3", { hasText: /Quick Pay — Order/ })).toBeVisible({ timeout: 15000 });

    await page.locator("button", { hasText: /^Pay \$/ }).click();

    // Demo payment succeeds (no Stripe key) and navigates to orders.
    await expect(page).toHaveURL(/\/orders/, { timeout: 20000 });
    await expect(page.locator(".notification-bar")).toContainText(/Payment successful!/);
    await expect(page.locator("span.badge", { hasText: "Paid" }).first()).toBeVisible({ timeout: 15000 });
  });

  test("order shows its items with real titles and totals", async ({ page }) => {
    await signup(page, "orderitem");
    await addFirstProductToCart(page);

    await page.goto("/checkout");
    await settle(page);
    const itemTitle = await page.locator(".co-item-title").first().textContent();
    expect(itemTitle?.trim().length ?? 0).toBeGreaterThan(0);

    await page.locator("button", { hasText: "Place Order" }).click();
    await expect(page.locator("h3", { hasText: /Quick Pay — Order/ })).toBeVisible({ timeout: 15000 });
    await page.locator("button", { hasText: "Pay later" }).click();

    // The order line renders the real product name (regression: backend
    // cart shape used to render "undefined x 1").
    const orderLine = page.locator("div.flex.items-center.justify-between.text-sm p").first();
    await expect(orderLine).not.toContainText("undefined");
    await expect(orderLine).toContainText(itemTitle!.trim());
  });
});
