import type { Page } from "@playwright/test";

export function settle(page: Page) {
  return page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
}
