import { test, expect } from "@playwright/test";
import { settle, signup } from "./helpers";

test.describe("Product comparison", () => {
  test.setTimeout(120000);

  test("compare page loads with counter and empty state", async ({ page }) => {
    await page.goto("/compare");
    await settle(page);
    await expect(page.locator("h2", { hasText: /\(0\/3\)/ })).toBeVisible();
  });

  test("products can be added up to the 3-item limit", async ({ page }) => {
    await signup(page, "cmpuser");
    await page.goto("/compare");
    await settle(page);

    const addSelect = page.locator("select[aria-label='Compare']");
    await expect(addSelect).toBeVisible({ timeout: 15000 });

    // Add three products through the select.
    for (let i = 0; i < 3; i++) {
      const options = addSelect.locator("option[value]:not([value=''])");
      const value = await options.first().getAttribute("value");
      await addSelect.selectOption(value!);
      await expect(page.locator(`h2`, { hasText: new RegExp(`\\(${i + 1}/3\\)`) })).toBeVisible();
    }

    // At the limit the select is disabled and shows the full hint.
    await expect(addSelect).toBeDisabled();

    // Comparison table rows render for the selected products.
    await expect(page.locator("text=Price").first()).toBeVisible();

    // Removing one re-enables the select.
    await page.locator("button", { hasText: "Remove" }).first().click();
    await expect(addSelect).toBeEnabled();
    await expect(page.locator("h2", { hasText: /\(2\/3\)/ })).toBeVisible();
  });

  test("clear all resets the tray", async ({ page }) => {
    await signup(page, "cmpclear");
    await page.goto("/compare");
    await settle(page);

    const addSelect = page.locator("select[aria-label='Compare']");
    const options = addSelect.locator("option[value]:not([value=''])");
    const value = await options.first().getAttribute("value");
    await addSelect.selectOption(value!);
    await expect(page.locator("h2", { hasText: /\(1\/3\)/ })).toBeVisible();

    await page.locator("button", { hasText: "Clear All" }).click();
    await expect(page.locator("h2", { hasText: /\(0\/3\)/ })).toBeVisible();
  });
});
