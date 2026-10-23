import { test, expect } from "@playwright/test";
import { settle } from "./helpers";

test.describe("Minigame", () => {
  test.setTimeout(120000);

  test("page loads either the game or a graceful error, never a crash", async ({ page }) => {
    await page.goto("/minigame");
    await settle(page);

    // The game is a canvas; if the WASM/JS fails to load the page must show
    // the graceful error UI instead of an unhandled Next.js crash.
    const canvas = page.locator("canvas").first();
    const errorUi = page.locator("text=/Error loading/i").first();
    await expect(canvas.or(errorUi)).toBeVisible({ timeout: 20000 });
  });

  test("page has no unhandled runtime error overlay", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/minigame");
    await settle(page);
    await page.waitForTimeout(2000);

    // Filter out benign dev-mode hydration chatter; fail on real crashes.
    const fatal = pageErrors.filter(
      (e) => !/hydrat|Minified React error|Download the React DevTools/i.test(e)
    );
    expect(fatal).toEqual([]);
  });
});
