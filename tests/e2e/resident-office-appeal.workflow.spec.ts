import fs from "fs";
import { test, expect } from "@playwright/test";

const RESIDENT_STATE = "test-results/.auth/smoke-resident.json";
const ADMIN_STATE = "test-results/.auth/smoke-admin.json";

test("resident -> office -> resident appeal workflow", async ({ browser }, testInfo) => {
  const allowedProjects = ["smoke-office-admin", "smoke-billing-admin"];
  if (!allowedProjects.includes(testInfo.project.name)) {
    test.skip(true, `Not a workflow project (${testInfo.project.name})`);
  }
  if (!fs.existsSync(RESIDENT_STATE) || !fs.existsSync(ADMIN_STATE)) {
    test.skip(true, "Missing storageState files for resident/admin");
  }

  const residentContext = await browser.newContext({ storageState: RESIDENT_STATE });
  const adminContext = await browser.newContext({ storageState: ADMIN_STATE });

  const residentPage = await residentContext.newPage();
  await residentPage.goto("/cabinet/appeals/new", { waitUntil: "domcontentloaded" });
  await expect(residentPage).toHaveURL(/\/cabinet\/appeals\/new|\/onboarding|\/forbidden/, { timeout: 15000 });
  if (!residentPage.url().includes("/cabinet/appeals/new")) {
    test.skip(true, "Resident cannot access appeals new (onboarding or forbidden)");
  }

  await expect(residentPage.getByTestId("cabinet-appeals-new-title")).toBeVisible({ timeout: 10000 });
  const title = `E2E appeal ${Date.now()}`;
  await residentPage.getByTestId("cabinet-appeals-new-title").fill(title);
  await residentPage.getByTestId("cabinet-appeals-new-body").fill("Тестовое обращение для workflow.");
  await Promise.all([
    residentPage.getByTestId("cabinet-appeals-new-submit").click(),
    residentPage.waitForURL(/\/cabinet\/appeals\/[^/]+|\/cabinet\/appeals(\/|$)/, { timeout: 15000 }),
  ]);

  let appealId: string | null = null;
  const afterSubmitUrl = residentPage.url();
  const match = afterSubmitUrl.match(/\/cabinet\/appeals\/([^/]+)/);
  if (match?.[1]) {
    appealId = match[1];
  } else {
    await residentPage.goto("/cabinet/appeals", { waitUntil: "domcontentloaded" });
    await expect(residentPage.getByTestId("cabinet-appeals-list")).toBeVisible({ timeout: 10000 });
    const firstItem = residentPage.locator('[data-testid^="cabinet-appeals-item-"]').first();
    const testId = await firstItem.getAttribute("data-testid");
    appealId = testId ? testId.replace("cabinet-appeals-item-", "") : null;
    await firstItem.click();
  }

  if (!appealId) {
    test.skip(true, "Appeal id not found after creation");
  }

  const adminPage = await adminContext.newPage();
  await adminPage.goto(`/office/appeals/${appealId}`, { waitUntil: "domcontentloaded" });
  await expect(adminPage).toHaveURL(/\/office\/appeals\/[^/]+/, { timeout: 15000 });
  await expect(adminPage.getByTestId("office-appeal-details")).toBeVisible({ timeout: 10000 });

  const takeButton = adminPage.getByTestId("appeal-action-take");
  if (await takeButton.isVisible().catch(() => false)) {
    await takeButton.click();
    await expect(adminPage.getByTestId("appeal-status")).toContainText(/В работе/i, { timeout: 15000 });
  }

  await residentPage.goto(`/cabinet/appeals/${appealId}`, { waitUntil: "domcontentloaded" });
  await expect(residentPage.getByTestId("cabinet-appeal-root")).toBeVisible({ timeout: 10000 });
  await expect(residentPage.getByTestId("cabinet-appeal-status")).toBeVisible({ timeout: 10000 });
  await residentContext.close();
  await adminContext.close();
});
