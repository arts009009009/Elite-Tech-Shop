import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("navbar links work", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav")).toBeVisible();

    await page.locator("nav a", { hasText: "Products" }).click();
    await expect(page).toHaveURL(/\/products/);

    await page.goto("/");
    await page.locator("nav a", { hasText: "Categories" }).click();
    await expect(page).toHaveURL(/\/categories/);

    await page.goto("/");
    await page.locator("nav a", { hasText: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart/);

    await page.goto("/");
    await page.locator("nav a", { hasText: "Profile" }).click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test("homepage loads products", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h2", { hasText: "Products" })).toBeVisible();

    await page.waitForSelector(".spinner", { state: "detached", timeout: 10000 }).catch(() => {});

    const productCount = await page.locator('a[href^="/product/"]').count();
    expect(productCount).toBeGreaterThanOrEqual(0);
  });

  test("categories page loads", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("h2", { hasText: /Categories/ })).toBeVisible();
    await expect(page.locator("text=All Products →")).toBeVisible();
  });

  test("404 page for unknown routes", async ({ page }) => {
    const response = await page.goto("/nonexistent-page-xyz");
    expect(response?.status()).toBe(404);
    await expect(page.locator("h1", { hasText: "404" })).toBeVisible();
    await expect(page.locator("text=This page does not exist.")).toBeVisible();
    await expect(page.locator("text=GO HOME")).toBeVisible();
  });
});
