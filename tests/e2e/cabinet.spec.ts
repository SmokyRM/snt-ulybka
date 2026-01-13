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
    const newCta = page.getByTestId("cabinet-appeals-new-cta");
    const emptyCta = page.getByTestId("cabinet-appeals-empty-cta");
    let newCtaVisible = false;
    try {
      await expect(newCta).toBeVisible({ timeout: 1000 });
      newCtaVisible = true;
    } catch {
      // ignore
    }
    const appealLink = newCtaVisible ? newCta : emptyCta;
    await expect(appealLink).toBeVisible();
    await appealLink.click();
    await expect(page).toHaveURL(/\/cabinet\/appeals\/new/);
    await expect(page.getByTestId("cabinet-appeals-new-root")).toBeVisible();
  });
});
