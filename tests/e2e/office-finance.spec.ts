import { test, expect, type Page, type Response } from "@playwright/test";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";
const secretaryCode = process.env.TEST_SECRETARY_CODE || "3333";

async function login(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel(/код доступа/i).fill(code);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(/^(?!.*login).*$/);
}

test.describe("Office finance", () => {
  test("accountant sees finance and can export CSV", async ({ page }) => {
    await login(page, accountantCode, "/office/finance");
    await page.goto(`${base}/office/finance`);
    await expect(page.getByTestId("office-finance-root")).toBeVisible();
    const [resp] = await Promise.all([
      page.waitForResponse((response: Response) => response.url().includes("/office/finance/export.csv")),
      page.getByTestId("finance-export-csv").click(),
    ]);
    if (resp.status() !== 200) {
      throw new Error(`Unexpected status ${resp.status()}`);
    }
    const contentType = resp.headers()["content-type"] || resp.headers()["Content-Type"];
    if (!contentType || !contentType.includes("text/csv")) {
      throw new Error(`Unexpected content-type: ${contentType}`);
    }
  });

  test("secretary is forbidden", async ({ page }) => {
    await login(page, secretaryCode, "/office/finance");
    await page.goto(`${base}/office/finance`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
