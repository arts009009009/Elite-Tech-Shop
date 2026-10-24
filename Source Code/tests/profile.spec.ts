import { test, expect } from "@playwright/test";
import { settle, signup } from "./helpers";

test.describe("Profile", () => {
  test.setTimeout(120000);

  test("logged-out users are asked to login", async ({ page }) => {
    await page.goto("/profile");
    await settle(page);
    await expect(page.locator("text=Please log in to view your profile.")).toBeVisible();
  });

  test("profile page renders for a signed-in user", async ({ page }) => {
    await signup(page, "profuser");
    await page.goto("/profile");
    await settle(page);
    await expect(page.locator("text=Your Profile")).toBeVisible();
  });

  test("password change validates minimum length client-side", async ({ page }) => {
    await signup(page, "profpw");
    await page.goto("/profile");
    await settle(page);

    // Fill the password form with a too-short new password.
    const inputs = page.locator('input[type="password"]');
    await inputs.nth(0).fill("oldpassword");
    await inputs.nth(1).fill("short");

    await page.locator("button", { hasText: "Change Password" }).click();
    await expect(page.locator("text=Password must be at least 8 characters")).toBeVisible();
  });

  test("cart save/load feedback works", async ({ page }) => {
    await signup(page, "profcart");
    await page.goto("/profile");
    await settle(page);

    await page.locator("button", { hasText: "Save Cart" }).click();
    await expect(page.locator("text=Cart saved locally!")).toBeVisible({ timeout: 10000 });

    await page.locator("button", { hasText: "Load Saved Cart" }).click();
    await expect(page.locator("text=/No saved cart found|Loaded \\d+ saved items/")).toBeVisible({ timeout: 10000 });
  });
});
