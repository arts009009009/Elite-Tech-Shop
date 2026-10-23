import { test, expect } from "@playwright/test";
import { settle, signup } from "./helpers";

test.describe("Wishlist", () => {
  test.setTimeout(120000);

  test("logged-out users are asked to login", async ({ page }) => {
    await page.goto("/wishlist");
    await settle(page);
    await expect(page.locator("h2", { hasText: "Wishlist" })).toBeVisible();
    await expect(page.locator("text=Login")).toBeVisible();
  });

  test("empty wishlist for a fresh account", async ({ page }) => {
    await signup(page, "wishuser");
    await page.goto("/wishlist");
    await settle(page);
    await expect(page.locator("text=No items in wishlist.")).toBeVisible();
  });

  test("adding from a home product card appears on the wishlist page", async ({ page }) => {
    await signup(page, "wishadd");
    await page.goto("/");
    await page.waitForSelector(".spinner", { state: "detached", timeout: 15000 }).catch(() => {});

    // Home page renders ProductCard components with a wishlist toggle.
    const wishButton = page.locator("button", { hasText: "Wishlist" }).first();
    await expect(wishButton).toBeVisible({ timeout: 15000 });
    await wishButton.click();

    await page.goto("/wishlist");
    await settle(page);
    await expect(page.locator("text=No items in wishlist.")).not.toBeVisible();
    await expect(page.locator("button", { hasText: "Remove" }).first()).toBeVisible();
  });

  test("Add All to Cart actually adds items (regression: fired a no-op event)", async ({ page }) => {
    await signup(page, "wishcart");
    await page.goto("/");
    await page.waitForSelector(".spinner", { state: "detached", timeout: 15000 }).catch(() => {});

    const wishButton = page.locator("button", { hasText: "Wishlist" }).first();
    await expect(wishButton).toBeVisible({ timeout: 15000 });
    await wishButton.click();

    await page.goto("/wishlist");
    await settle(page);
    await page.locator("button", { hasText: "Add All to Cart" }).click();

    // The navbar badge counts quantities and must now reflect the add.
    await expect(page.locator("nav span", { hasText: /Cart: [1-9]/ })).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".notification-bar")).toContainText(/Added 1 items to cart!/);
  });

  test("clear wishlist empties the list", async ({ page }) => {
    await signup(page, "wishclear");
    await page.goto("/");
    await page.waitForSelector(".spinner", { state: "detached", timeout: 15000 }).catch(() => {});
    const wishButton = page.locator("button", { hasText: "Wishlist" }).first();
    await expect(wishButton).toBeVisible({ timeout: 15000 });
    await wishButton.click();

    await page.goto("/wishlist");
    await settle(page);
    await page.locator("button", { hasText: "Clear Wishlist" }).click();
    await expect(page.locator("text=No items in wishlist.")).toBeVisible();
  });
});
