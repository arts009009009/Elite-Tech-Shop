import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("signup flow", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("h2")).toHaveText("Signup");

    await page.locator('input[placeholder="Username"]').fill("testuser");
    await page.locator('input[placeholder="Email"]').fill("test@example.com");
    await page.locator('input[placeholder="Password"]').fill("password123");
    await page.locator('input[placeholder="Confirm Password"]').fill("password123");

    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL("/");
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("h2")).toHaveText("Login");
    await expect(page.locator('input[placeholder="Username"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");

    await page.locator('input[placeholder="Username"]').fill("nonexistent");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.locator('button[type="submit"]').click();

    await expect(page.locator("p", { hasText: /failed|invalid|error/i })).toBeVisible();
  });

  test("logout clears session", async ({ page }) => {
    await page.goto("/signup");
    await page.locator('input[placeholder="Username"]').fill("logtestuser");
    await page.locator('input[placeholder="Email"]').fill("logtest@example.com");
    await page.locator('input[placeholder="Password"]').fill("password123");
    await page.locator('input[placeholder="Confirm Password"]').fill("password123");
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL("/");

    await page.goto("/profile");
    await expect(page.locator("text=Your Profile")).toBeVisible();
  });

  test("unauthenticated user redirected from profile", async ({ page }) => {
    await page.goto("/profile");
    await expect(page.locator("text=Please log in to view your profile.")).toBeVisible();
  });
});
