import type { Page } from "@playwright/test";

export function settle(page: Page) {
  return page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
}

export function uniqueUser(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Creates a fresh account through the signup UI and lands on "/". */
export async function signup(page: Page, prefix = "testuser") {
  const username = uniqueUser(prefix);
  await page.goto("/signup");
  await settle(page);
  await page.locator('input[placeholder="Username"]').fill(username);
  await page.locator('input[placeholder="Email"]').fill(`${username}@example.com`);
  await page.locator('input[placeholder="Password"]').fill("password123");
  await page.locator('input[placeholder="Confirm Password"]').fill("password123");
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/signup"), { timeout: 15000 });
  return username;
}

/** Adds the first product on the home page to the cart via its detail page. */
export async function addFirstProductToCart(page: Page) {
  await page.goto("/");
  await page.waitForSelector(".spinner", { state: "detached", timeout: 15000 }).catch(() => {});
  const productLink = page.locator('a[href^="/product/"]').first();
  await productLink.click();
  await settle(page);
  await page.locator(".pd-add-btn, button", { hasText: "Add to Cart" }).first().click();
  await page.waitForTimeout(500);
}
