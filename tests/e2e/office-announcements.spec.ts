import { test, expect, type Page } from "@playwright/test";
import { loginResidentByCode } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
const secretaryCode = process.env.TEST_SECRETARY_CODE || "3333";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";

async function login(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.getByTestId("login-access-code").fill(code);
  const urlPattern = new RegExp(next.replace("/", "\\/") + "(\\/|$)", "i");
  await Promise.all([
    page.waitForURL(urlPattern, { timeout: 15000 }),
    page.getByTestId("login-submit").click(),
  ]);
}

test.describe("Office announcements", () => {
  test("secretary can open announcements list", async ({ page }) => {
    await login(page, secretaryCode, "/office");
    await page.goto(`${base}/office/announcements`);
    await expect(page).toHaveURL(/\/office\/announcements/);
    await expect(page.getByTestId("office-announcements-root")).toBeVisible();
  });

  test("accountant is forbidden for announcements", async ({ page }) => {
    await login(page, accountantCode, "/office");
    await page.goto(`${base}/office/announcements`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("chairman can create announcement", async ({ page }) => {
    await login(page, chairmanCode, "/office");
    await page.goto(`${base}/office/announcements/new`);
    await expect(page.getByTestId("office-announcement-new-form")).toBeVisible();
    const title = `Автотест объявление ${Date.now()}`;
    await page.getByLabel(/заголовок/i).fill(title);
    await page.getByLabel(/^текст$/i).fill("Тестовое объявление для проверки создания.");
    await page.getByRole("button", { name: /сохранить/i }).click();
    await expect(page).toHaveURL(/\/office\/announcements\//);
    await expect(page.getByTestId("office-announcement-root")).toBeVisible();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    const publishButton = page.getByTestId("announcement-publish");
    await publishButton.first().click().catch(() => {});
    await page.goto(`${base}/office/announcements`);
    await expect(page.getByTestId("office-announcements-root")).toBeVisible();
    const row = page.getByTestId("office-announcement-row").filter({ hasText: title }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(/Опубликовано/i);
  });

  test("secretary can edit announcement", async ({ page }) => {
    await login(page, secretaryCode, "/office");
    await page.goto(`${base}/office/announcements`);
    const first = page.getByTestId("office-announcement-row").first();
    await first.getByRole("link", { name: /открыть/i }).click();
    await expect(page.getByTestId("office-announcement-root")).toBeVisible();
    await page.getByTestId("announcement-edit").click();
    await expect(page.getByTestId("office-announcement-edit-form")).toBeVisible();
    const suffix = ` (edit ${Date.now()})`;
    const titleInput = page.getByLabel(/заголовок/i);
    const newTitle = `Объявление ${suffix}`;
    await titleInput.fill(newTitle);
    await page.getByTestId("announcement-save").click();
    await expect(page).toHaveURL(/\/office\/announcements\//);
    await expect(page.getByRole("heading", { name: newTitle })).toBeVisible();
  });
});
