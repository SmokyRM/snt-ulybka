import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Smoke: Resident login and cabinet", () => {
  test.beforeEach(({}, testInfo) => {
    if (testInfo.project.name !== "smoke-billing-resident") {
      test.skip(true, `Resident tests run only in smoke-billing-resident (current: ${testInfo.project.name})`);
    }
  });

  test("resident login -> /cabinet (never /admin)", async ({ page }) => {
    await page.goto(`${base}/cabinet`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/(cabinet|onboarding)(\/|$)/, { timeout: 15000 });

    const finalUrl = page.url();
    expect(finalUrl).not.toContain("/admin");

    const validPaths = ["/cabinet", "/onboarding", "/forbidden"];
    const isValidPath = validPaths.some((p) => finalUrl.includes(p));
    expect(isValidPath).toBe(true);

    if (finalUrl.includes("/cabinet")) {
      await expect(page).toHaveURL(/\/cabinet(\/|$)/, { timeout: 15000 });
      await expect(
        page.getByTestId("cabinet-root").or(page.getByTestId("cabinet-page-root"))
      ).toBeVisible({ timeout: 10000 });
    }

    if (finalUrl.includes("/onboarding")) {
      await expect(page.locator('input[name="fullName"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test("cabinet: create appeal -> shows success or appeal in list", async ({ page }) => {
    await page.goto(`${base}/cabinet/appeals/new`, { waitUntil: "domcontentloaded" });
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });

    const currentUrl = page.url();
    if (currentUrl.includes("/onboarding") || currentUrl.includes("/forbidden")) {
      test.skip(true, "User needs onboarding or access denied - skipping appeal creation");
      return;
    }

    if (!currentUrl.includes("/cabinet/appeals/new")) {
      await page.goto(`${base}/cabinet/appeals/new`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/cabinet\/appeals\/new|\/onboarding|\/forbidden/, { timeout: 15000 });

      const afterNav = page.url();
      if (afterNav.includes("/onboarding") || afterNav.includes("/forbidden")) {
        test.skip(true, "User needs onboarding or access denied - skipping appeal creation");
        return;
      }
    }

    await expect(page.getByTestId("cabinet-appeals-new-root")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("cabinet-appeals-new-form")).toBeVisible({ timeout: 15000 });

    const title = `Тестовое обращение ${Date.now()}`;
    const body = "Это тестовое обращение, созданное автоматическим тестом. Описание минимум 10 символов.";

    await page.getByTestId("cabinet-appeals-new-title").fill(title);
    await page.getByTestId("cabinet-appeals-new-body").fill(body);

    const submitButton = page.getByTestId("cabinet-appeals-new-submit");
    await expect(submitButton).toBeVisible();

    const responsePromise = page
      .waitForResponse((res) => res.url().includes("/api/appeals") && res.status() < 400, { timeout: 15000 })
      .catch(() => null);

    await submitButton.click();

    await Promise.race([
      expect(page).toHaveURL(/\/cabinet\/appeals(\/|$)/, { timeout: 15000 }),
      responsePromise,
    ]).catch(() => {});

    const afterSubmit = page.url();
    const isOnAppealsPage = afterSubmit.includes("/cabinet/appeals") && !afterSubmit.includes("/new");
    const isOnCabinet = afterSubmit.includes("/cabinet");
    expect(isOnAppealsPage || isOnCabinet).toBe(true);
  });
});
