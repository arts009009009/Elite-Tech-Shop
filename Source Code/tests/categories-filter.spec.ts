import { test, expect } from "@playwright/test";
import { settle } from "./helpers";

test.describe("Category filtering", () => {
  test.setTimeout(120000);

  test("category links carry their category to the products page", async ({ page }) => {
    await page.goto("/categories");
    await settle(page);

    const categoryLink = page.locator('a[href*="/products?category="]').first();
    await expect(categoryLink).toBeVisible({ timeout: 15000 });
    const href = await categoryLink.getAttribute("href");
    expect(href).toContain("category=");

    await categoryLink.click();

    // Regression: the products page used to ignore ?category= entirely.
    await expect(page).toHaveURL(/\/products\?category=/);
    await expect(page.locator("h2", { hasText: "Products" })).toBeVisible({ timeout: 15000 });
    // The active filter is shown with a clear affordance.
    await expect(page.locator('[aria-label="Clear category filter"]')).toBeVisible();
  });

  test("clearing the filter restores the full catalog", async ({ page }) => {
    await page.goto("/categories");
    await settle(page);
    const categoryLink = page.locator('a[href*="/products?category="]').first();
    await categoryLink.click();
    await expect(page.locator('[aria-label="Clear category filter"]')).toBeVisible({ timeout: 15000 });

    const filteredText = await page.locator("h2", { hasText: "Products" }).textContent();
    const filteredCount = Number(filteredText?.match(/\((\d+)\)/)?.[1] ?? "0");

    await page.locator('[aria-label="Clear category filter"]').click();
    await expect(page.locator('[aria-label="Clear category filter"]')).not.toBeVisible();

    const allText = await page.locator("h2", { hasText: "Products" }).textContent();
    const allCount = Number(allText?.match(/\((\d+)\)/)?.[1] ?? "0");
    expect(allCount).toBeGreaterThanOrEqual(filteredCount);
  });
});
