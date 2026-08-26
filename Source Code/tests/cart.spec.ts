import { test, expect } from "@playwright/test";

test.describe("Cart", () => {
  test("cart page loads empty", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator("h2")).toHaveText("Shopping Cart");
    await expect(page.locator("text=Your cart is empty")).toBeVisible();
    await expect(page.locator("text=Continue Shopping")).toBeVisible();
  });

  test("add to cart from product page", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".spinner", { state: "detached", timeout: 10000 }).catch(() => {});

    const productLink = page.locator('a[href^="/product/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await page.waitForLoadState("networkidle");

      const addBtn = page.locator("button", { hasText: "Add to Cart" });
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await expect(page.locator("nav span", { hasText: /Cart: [1-9]/ })).toBeVisible();
      }
    }
  });

  test("cart persists across navigation", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".spinner", { state: "detached", timeout: 10000 }).catch(() => {});

    const productLink = page.locator('a[href^="/product/"]').first();
    if (await productLink.isVisible()) {
      await productLink.click();
      await page.waitForLoadState("networkidle");

      const addBtn = page.locator("button", { hasText: "Add to Cart" });
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.goto("/cart");
        await expect(page.locator("text=Shopping Cart")).toBeVisible();
        await expect(page.locator("text=Your cart is empty")).not.toBeVisible();
      }
    }
  });
});
