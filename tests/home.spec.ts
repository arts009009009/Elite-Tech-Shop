import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("loads and shows navbar", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Elite/);
    await expect(page.locator("nav")).toBeVisible();
  });

  test("shows navigation links", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("nav a", { hasText: "Products" })).toBeVisible();
    await expect(page.locator("nav a", { hasText: "Categories" })).toBeVisible();
    await expect(page.locator("nav a", { hasText: "Cart" })).toBeVisible();
    await expect(page.locator("nav a", { hasText: "Profile" })).toBeVisible();
  });

  test("shows version info", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Build 566")).toBeVisible();
  });
});
