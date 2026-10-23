import { test, expect } from "@playwright/test";
import { settle } from "./helpers";

test.describe("Frostbite OS", () => {
  test.setTimeout(120000);

  test("desktop boots with the app dock", async ({ page }) => {
    await page.goto("/frostbite-os");
    await settle(page);
    // Core dock apps are present.
    await expect(page.locator(".fs-icon-label", { hasText: "Word" })).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".fs-icon-label", { hasText: "Calculator" })).toBeVisible();
    await expect(page.locator(".fs-icon-label", { hasText: "Browser" })).toBeVisible();
  });

  test("clicking an app icon opens its window", async ({ page }) => {
    await page.goto("/frostbite-os");
    await settle(page);

    await page.locator(".fs-icon-label", { hasText: "Calculator" }).click();
    // The regression-tagged window carries data-win-id (used by the glitch
    // overlay to target the newly opened window, not the first one).
    await expect(page.locator('.fs-win[data-win-id="calculator"]')).toBeVisible({ timeout: 15000 });
  });

  test("standalone calculator route renders", async ({ page }) => {
    await page.goto("/frostbite-os/calculator");
    await settle(page);
    await expect(page.locator("#calc-expression, input").first()).toBeVisible({ timeout: 15000 });
  });

  test("system monitor renders without crashing", async ({ page }) => {
    await page.goto("/frostbite-os/systemmonitor");
    await settle(page);
    // Page must mount (it previously busy-waited the main thread).
    await expect(page.locator("body")).toBeVisible();
  });

  test("notepad opens a blank document", async ({ page }) => {
    await page.goto("/frostbite-os/notepad");
    await settle(page);
    await expect(page.locator("textarea").first()).toBeVisible({ timeout: 15000 });
  });
});
