import { test, expect, type Page } from "@playwright/test";

test.describe("Cabinet pages stay logged in", () => {
  test.use({ storageState: "playwright/.auth/state.json" });

  test("templates accessible after login", async ({ page }: { page: Page }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.goto(base + "/cabinet/templates");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("cabinet-templates-root")).toBeVisible();
    await expect(page.getByTestId("cabinet-templates-root")).not.toContainText("Что-то пошло не так");
  });

  test("appeals accessible after login and CTA works", async ({ page }: { page: Page }) => {
    const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
    await page.goto(base + "/cabinet/appeals");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByTestId("cabinet-appeals-root")).toBeVisible();
    await page.getByRole("link", { name: /обращение/i }).first().click();
    await expect(page).toHaveURL(/\/cabinet\/appeals\/new/);
    await expect(page.getByTestId("cabinet-appeals-new-form")).toBeVisible();
  });
});
