import { test, expect, type Page } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("Office announcements", () => {
  test("secretary can open announcements list", async ({ page }) => {
    await loginStaff(page, "secretary", "/office");
    await page.goto(`${base}/office/announcements`);
    await expect(page).toHaveURL(/\/office\/announcements/);
    await expect(page.getByTestId("office-announcements-root")).toBeVisible();
  });

  test("accountant is forbidden for announcements", async ({ page }) => {
    const loggedIn = await loginStaff(page, "accountant", "/office");
    test.skip(!loggedIn, "AUTH_USER_ACCOUNTANT and AUTH_PASS_ACCOUNTANT are not set");
    await page.goto(`${base}/office/announcements`);
    await expect(page).toHaveURL(/forbidden/);
  });

  test("chairman can create announcement", async ({ page }) => {
    await loginStaff(page, "chairman", "/office");
    await page.goto(`${base}/office/announcements/new`);
    await expect(page.getByTestId("office-announcements-new-root")).toBeVisible();
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
    await loginStaff(page, "secretary", "/office");
    await page.goto(`${base}/office/announcements`);
    const first = page.getByTestId("office-announcement-row").first();
    await expect(first).toBeVisible();
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
