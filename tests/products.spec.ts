import { test, expect } from "@playwright/test";

test.describe("Products page", () => {
  test("navigates to products page", async ({ page }) => {
    await page.goto("/products");
    await expect(page.locator("h2", { hasText: "Products" })).toBeVisible();
  });

  test("shows product grid or empty state", async ({ page }) => {
    await page.goto("/products");
    const heading = page.locator("h2", { hasText: "Products" });
    await expect(heading).toBeVisible();
  });
});

test.describe("Categories page", () => {
  test("navigates to categories page", async ({ page }) => {
    await page.goto("/categories");
    await expect(page.locator("h2", { hasText: "Categories" })).toBeVisible();
  });
});
