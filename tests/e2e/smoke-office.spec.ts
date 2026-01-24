import { test, expect } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Smoke: Office minimal coverage", () => {
  test.beforeEach(({}, testInfo) => {
    if (testInfo.project.name !== "smoke-office-admin") {
      test.skip(true, `Office smoke runs only in smoke-office-admin (current: ${testInfo.project.name})`);
    }
  });

  test("office: appeals list page renders", async ({ page }) => {
    await page.goto(`${base}/office/appeals`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/office\/appeals(\/|$)/, { timeout: 15000 });
    await expect(page.getByTestId("office-root")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("office-appeals-page")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("office-appeals-list")).toBeVisible({ timeout: 10000 });
  });

  test("office: finance import preview page renders", async ({ page }) => {
    await page.goto(`${base}/office/finance/import`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/office\/finance\/import(\/|$)/, { timeout: 15000 });
    await expect(page.getByTestId("office-root")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("finance-import")).toBeVisible({ timeout: 10000 });

    const apiResponse = await page.request.get(`${base}/api/office/appeals`);
    const status = apiResponse.status();
    expect([200, 400, 401, 403]).toContain(status);
    if (status === 200) {
      const json = await apiResponse.json();
      expect(json).toHaveProperty("ok");
      if (json.ok) {
        expect(json).toHaveProperty("data");
      } else {
        expect(json).toHaveProperty("error");
      }
    }
  });
});
