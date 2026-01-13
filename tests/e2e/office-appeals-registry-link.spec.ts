import { test, expect, type Page } from "@playwright/test";
<<<<<<< HEAD
import { loginResidentByCode } from "./helpers/auth";
=======
>>>>>>> 737c5be (codex snapshot)

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";

async function login(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
<<<<<<< HEAD
  await page.getByTestId("login-access-code").fill(code);
  await page.getByTestId("login-submit").click();
  const urlPattern = new RegExp(next.replace("/", "\\/") + "(\\/|$)", "i");
  await page.waitForURL(urlPattern, { timeout: 15000 });
}

test.describe("Office appeals registry link", () => {
  test.use({ storageState: undefined });

=======
  await page.getByLabel(/код доступа/i).fill(code);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(/^(?!.*login).*$/);
}

test.describe("Office appeals registry link", () => {
>>>>>>> 737c5be (codex snapshot)
  test("chairman opens registry from appeal with plotNumber", async ({ page }) => {
    await login(page, chairmanCode, "/office/appeals?q=Березовая, 12");
    await page.goto(`${base}/office/appeals?q=${encodeURIComponent("Березовая, 12")}`);
    await expect(page.getByTestId("office-appeals-root")).toBeVisible();
    await page.getByTestId("appeals-list-item").first().click();
    await expect(page.getByTestId("office-appeal-root")).toBeVisible();
    await page.getByTestId("appeal-open-registry").click();
    await expect(page).toHaveURL(/\/office\/registry\//);
    await expect(page.getByTestId("office-registry-item-root")).toBeVisible();
  });

  test("accountant forbidden for appeal", async ({ page }) => {
    await login(page, accountantCode, "/office/appeals/a1");
    await page.goto(`${base}/office/appeals/a1`);
    await expect(page).toHaveURL(/forbidden/);
  });
});
