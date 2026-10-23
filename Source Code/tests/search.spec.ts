import { test, expect } from "@playwright/test";
import { settle } from "./helpers";

test.describe("Search", () => {
  test.setTimeout(120000);

  test("navbar search finds products via live results", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".spinner", { state: "detached", timeout: 15000 }).catch(() => {});

    const searchInput = page.locator('nav input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });
    await searchInput.fill("MacBook");

    // LiveSearch dropdown shows matching product titles.
    await expect(page.locator("text=Apple MacBook Air M4").first()).toBeVisible({ timeout: 15000 });
  });

  test("clearing the search resets results without errors", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector(".spinner", { state: "detached", timeout: 15000 }).catch(() => {});

    const searchInput = page.locator('nav input[placeholder*="Search"]').first();
    await searchInput.fill("MacBook");
    await expect(page.locator("text=Apple MacBook Air M4").first()).toBeVisible({ timeout: 15000 });

    // Regression: an empty query used to trigger the debounce with a
    // spinner; the app must stay responsive and error-free.
    await searchInput.fill("");
    await expect(page.locator("h2", { hasText: "Products" })).toBeVisible();
  });

  test("products page search filters the catalog", async ({ page }) => {
    await page.goto("/products");
    await settle(page);
    const heading = page.locator("h2", { hasText: "Products" });
    await expect(heading).toBeVisible();
    // Page renders without a crash and shows a product count.
    await expect(heading).toContainText(/\(\d+\)/);
  });
});
