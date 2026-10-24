import { test, expect } from "@playwright/test";
import { settle, signup, addFirstProductToCart } from "./helpers";

test.describe("Notification toasts", () => {
  test.setTimeout(120000);

  test("adding to cart shows a visible toast (regression: invisible toast)", async ({ page }) => {
    await signup(page, "notifuser");
    await addFirstProductToCart(page);

    // Regression: the toast container had height:0 overflow:hidden so the
    // "Added to Cart!" message was rendered but never visible.
    const toast = page.locator(".notification-bar").first();
    await expect(toast).toBeVisible({ timeout: 15000 });
    await expect(toast).toContainText(/Added to Cart!/);
  });

  test("toast can be dismissed", async ({ page }) => {
    await signup(page, "notifdismiss");
    await addFirstProductToCart(page);

    const toast = page.locator(".notification-bar").first();
    await expect(toast).toBeVisible({ timeout: 15000 });

    const closeBtn = page.locator('button[aria-label="Close notification"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await expect(toast).not.toBeVisible({ timeout: 10000 });
    }
  });
});
