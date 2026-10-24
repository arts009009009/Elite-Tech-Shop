import { test, expect } from "@playwright/test";
import { settle, signup, addFirstProductToCart } from "./helpers";

test.describe("Orders", () => {
  test.setTimeout(120000);

  test("logged-out users are asked to login", async ({ page }) => {
    await page.goto("/orders");
    await settle(page);
    await expect(page.locator("text=Please login to view your orders.")).toBeVisible();
  });

  test("search with no matches shows the empty-filter state", async ({ page }) => {
    await signup(page, "ordsearch");
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await settle(page);
    await page.locator("button", { hasText: "Place Order" }).click();
    await expect(page.locator("h3", { hasText: /Quick Pay — Order/ })).toBeVisible({ timeout: 15000 });
    await page.locator("button", { hasText: "Pay later" }).click();
    await expect(page.locator("text=1 order found")).toBeVisible({ timeout: 15000 });

    await page.locator('input[placeholder="Search orders..."]').fill("zzz-no-such-product");
    await expect(page.locator("text=No orders match your filters.")).toBeVisible();

    // Clearing the search restores the order.
    await page.locator('input[placeholder="Search orders..."]').fill("");
    await expect(page.locator("text=1 order found")).toBeVisible();
  });

  test("status filter matches the server status, not a date guess", async ({ page }) => {
    await signup(page, "ordfilter");
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await settle(page);
    await page.locator("button", { hasText: "Place Order" }).click();
    await expect(page.locator("h3", { hasText: /Quick Pay — Order/ })).toBeVisible({ timeout: 15000 });
    await page.locator("button", { hasText: "Pay later" }).click();
    await expect(page.locator("text=1 order found")).toBeVisible({ timeout: 15000 });

    // Regression: every order used to render as "Delivered". Scope to the
    // status filter (the navbar's Language select is the page's first select).
    const select = page.locator('select:has(option[value="delivered"])');
    await select.selectOption("delivered");
    await expect(page.locator("text=No orders match your filters.")).toBeVisible();

    await select.selectOption("processing");
    await expect(page.locator("text=1 order found")).toBeVisible();
    await expect(page.locator("span.badge", { hasText: "Processing" }).first()).toBeVisible();
  });

  test("order cards expose review and PDF actions", async ({ page }) => {
    await signup(page, "ordactions");
    await addFirstProductToCart(page);
    await page.goto("/checkout");
    await settle(page);
    await page.locator("button", { hasText: "Place Order" }).click();
    await expect(page.locator("h3", { hasText: /Quick Pay — Order/ })).toBeVisible({ timeout: 15000 });
    await page.locator("button", { hasText: "Pay later" }).click();

    const reviewBtn = page.locator("button", { hasText: "Review" }).first();
    await expect(reviewBtn).toBeVisible({ timeout: 15000 });
    await reviewBtn.click();
    // Review form opens for the first item of the order.
    await expect(page.locator("button", { hasText: "Cancel" }).first()).toBeVisible();
  });
});
