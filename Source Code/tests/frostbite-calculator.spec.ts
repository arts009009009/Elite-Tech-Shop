import { test, expect } from "@playwright/test";
import { settle } from "./helpers";

test.describe("Frostbite OS scientific calculator", () => {
  test.setTimeout(120000);

  test("desktop icon opens the calculator backed by the C++ service", async ({ page }) => {
    await page.goto("/frostbite-os");
    await settle(page);

    const icon = page.locator(".fs-icon").filter({ hasText: "Calculator" });
    await expect(icon).toBeVisible();
    await icon.click();

    const expression = page.locator("#calc-expression");
    await expect(expression).toBeVisible();

    await expression.fill("3 * sin(x) + x^2");
    await page.locator("#calc-x").fill("2.5");
    await page.getByRole("button", { name: "=", exact: true }).click();
    await expect(page.getByTestId("calc-result")).toContainText("8.045");
    await expect(page.getByTestId("calc-error")).toHaveCount(0);
  });

  test("derivative and graph modes use the backend", async ({ page }) => {
    await page.goto("/frostbite-os/calculator");
    await settle(page);

    await page.getByRole("button", { name: "Derivative" }).click();
    await expect(page.locator("#calc-variable")).toBeVisible();
    await page.locator("#calc-expression").fill("x^3 + 2*x");
    await page.getByRole("button", { name: "=", exact: true }).click();
    await expect(page.getByTestId("calc-derivative")).toContainText("3*x^2 + 2");

    await page.getByRole("button", { name: "Graph" }).click();
    await expect(page.locator("#calc-min")).toBeVisible();
    await page.locator("#calc-expression").fill("sin(x)");
    await page.getByRole("button", { name: "=", exact: true }).click();
    await expect(page.getByTestId("calc-graph")).toBeVisible();
    await expect(page.locator("[data-testid='calc-graph'] polyline").first()).toBeVisible();
  });

  test("backend errors surface in the UI", async ({ page }) => {
    await page.goto("/frostbite-os/calculator");
    await settle(page);
    await page.locator("#calc-expression").fill("1/0");
    await page.getByRole("button", { name: "=", exact: true }).click();
    await expect(page.getByTestId("calc-error")).toContainText("division by zero");
  });
});
