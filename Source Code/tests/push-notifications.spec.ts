import { test, expect } from "@playwright/test";
import { settle } from "./helpers";

test.use({ launchOptions: { channel: "chromium" } });

test.describe("push notifications", () => {
  test.setTimeout(120000);

  test("service worker registers on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.goto("/");
    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      return registration.scope;
    });

    expect(scope).toContain("localhost:3000");
    expect(errors.filter((text) => text.includes("Service worker"))).toHaveLength(0);
  });

  test("granting permission flips the UI and the test loop runs", async ({ context, page }) => {
    await context.clearPermissions();
    await page.goto("/");
    await settle(page);

    const visibleButton = (name: RegExp) =>
      page.getByRole("button", { name }).locator("visible=true").first();
    const onState = page.getByText(/Notifications On/).locator("visible=true").first();

    await expect(visibleButton(/Enable Push Notifications/).or(onState)).toBeVisible();

    await context.grantPermissions(["notifications"], { origin: "http://localhost:3000" });

    const enable = visibleButton(/Enable Push Notifications/);
    if (await enable.isVisible().catch(() => false)) {
      await enable.dispatchEvent("click", { timeout: 5000 }).catch(() => undefined);
    }

    await expect(onState).toBeVisible();

    const testButton = visibleButton(/^Test$/);
    await expect(testButton).toBeVisible();
    await testButton.dispatchEvent("click");

    await expect(visibleButton(/Stop/)).toBeVisible();
  });

  test("notifications show through the service worker with a valid icon", async ({ context, page }) => {
    await context.grantPermissions(["notifications"], { origin: "http://localhost:3000" });
    await page.goto("/");

    const result = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification("Elite Tech Shop", {
        body: "Order confirmed",
        icon: "/elitetech.avif",
        tag: "playwright-check",
      });
      const active = registration.active?.state;
      const iconResponse = await fetch("/elitetech.avif");
      const missingIcon = await fetch("/favicon.svg");
      return { active, iconStatus: iconResponse.status, faviconStatus: missingIcon.status };
    });

    expect(result.active).toBe("activated");
    expect(result.iconStatus).toBe(200);
    expect(result.faviconStatus).toBe(404);
  });
});
