import { test, expect, type Page } from "@playwright/test";
<<<<<<< HEAD
import { loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office announcements", () => {
  test.use({ storageState: undefined });

  test("secretary can open announcements list", async ({ page }) => {
    await loginStaff(page, "secretary", "/office");
=======

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const chairmanCode = process.env.TEST_CHAIRMAN_CODE || "2222";
const secretaryCode = process.env.TEST_SECRETARY_CODE || "3333";
const accountantCode = process.env.TEST_ACCOUNTANT_CODE || "4444";

async function login(page: Page, code: string, next: string) {
  await page.goto(`${base}/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel(/код доступа/i).fill(code);
  await page.getByRole("button", { name: /войти/i }).click();
  await page.waitForURL(/^(?!.*login).*$/);
}

test.describe("Office announcements", () => {
  test("secretary can open announcements list", async ({ page }) => {
    await login(page, secretaryCode, "/office");
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/office/announcements`);
    await expect(page).toHaveURL(/\/office\/announcements/);
    await expect(page.getByTestId("office-announcements-root")).toBeVisible();
  });

  test("accountant is forbidden for announcements", async ({ page }) => {
<<<<<<< HEAD
    const ok = await loginStaff(page, "accountant", "/office");
    test.skip(!ok, "No accountant creds in local env");
=======
    await login(page, accountantCode, "/office");
>>>>>>> 737c5be (codex snapshot)
    await page.goto(`${base}/office/announcements`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("chairman can create announcement", async ({ page }) => {
<<<<<<< HEAD
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office/announcements/new`);
    await expect(page.getByTestId("office-announcements-new-root")).toBeVisible();
=======
    await login(page, chairmanCode, "/office");
    await page.goto(`${base}/office/announcements/new`);
    await expect(page.getByTestId("office-announcement-new-form")).toBeVisible();
>>>>>>> 737c5be (codex snapshot)
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
<<<<<<< HEAD
    await loginStaff(page, "secretary", "/office");
    await page.goto(`${base}/office/announcements`);
    const first = page.getByTestId("office-announcement-row").first();
    await expect(first).toBeVisible();
=======
    await login(page, secretaryCode, "/office");
    await page.goto(`${base}/office/announcements`);
    const first = page.getByTestId("office-announcement-row").first();
>>>>>>> 737c5be (codex snapshot)
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
