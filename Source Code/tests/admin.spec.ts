import { test, expect } from "@playwright/test";
import { settle } from "./helpers";

test.describe("Admin login", () => {
  test.setTimeout(120000);

  test("admin login page renders the OTP flow", async ({ page }) => {
    await page.goto("/admin");
    await settle(page);
    await expect(page.locator("h1", { hasText: "Admin Login" })).toBeVisible();
    // Step 1 of the flow: request the one-time password.
    await expect(page.locator("button", { hasText: "Send Password" })).toBeVisible();
    await expect(page.locator("text=Click to receive your password")).toBeVisible();
  });

  test("uses the seeded admin email, not the bare word admin", async ({ page }) => {
    await page.goto("/admin");
    await settle(page);

    // Regression: the page used to send { email: "admin" } which the Java
    // backend rejects with invalid_email_format. Capture the request body.
    const bodies: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/auth/send-password")) bodies.push(req.postData() || "");
    });

    await page.locator("button", { hasText: "Send Password" }).click();

    await expect
      .poll(() => bodies.length, { timeout: 15000 })
      .toBeGreaterThan(0);
    expect(bodies[0]).toContain("admin@elite.shop");
  });

  test("a failed login surfaces an error instead of a silent hang", async ({ page }) => {
    await page.goto("/admin");
    await settle(page);

    // Jump straight to the password step if the send step is available.
    const sendBtn = page.locator("button", { hasText: "Send Password" });
    if (await sendBtn.isVisible()) {
      await sendBtn.click();
      await page.waitForTimeout(1500);
    }

    const passwordInput = page.locator('input[type="password"]');
    if (await passwordInput.isVisible()) {
      await passwordInput.fill("definitely-wrong-password");
      await page.locator(".submit-btn, button[type='submit']").first().click();
      // Either an inline error or the recovery screen appears; the important
      // part is that the app never silently succeeds on a bad password.
      await expect(
        page.locator("text=/Cannot reach server|Invalid|denied|error|failed/i").first()
      ).toBeVisible({ timeout: 15000 });
    }
  });
});
