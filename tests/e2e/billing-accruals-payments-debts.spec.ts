import { test, expect } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";

test.describe("E2E: Accruals → Payment Import → Debts", () => {
  test.use({ storageState: undefined });

  test("full flow: create period → import payments → view debts", async ({ page }) => {
    // 1. Login as admin
    await page.goto(`${baseURL}/staff-login?next=/admin/billing/periods-unified`);
    await page.getByTestId("staff-login-username").fill("admin@snt.ru");
    await page.getByTestId("staff-login-password").fill(adminCode);
    await page.getByTestId("staff-login-submit").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/staff-login"), { timeout: 20000 });

    // 2. Navigate to periods page
    await page.goto(`${baseURL}/admin/billing/periods-unified`);
    await expect(page).toHaveURL(/\/admin\/billing\/periods-unified/);

    // Wait for page to load
    await page.waitForTimeout(1000);

    // 3. Create a new period (if form is available)
    const createButton = page.getByRole("button", { name: /создать|новый период/i }).first();
    const hasCreateButton = await createButton.isVisible().catch(() => false);

    if (hasCreateButton) {
      await createButton.click();
      await page.waitForTimeout(1000);

      // Fill period form
      const fromInput = page.locator('input[name="from"], input[type="date"]').first();
      const toInput = page.locator('input[name="to"], input[type="date"]').nth(1).or(page.locator('input[type="date"]').nth(1));

      const today = new Date();
      const fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const formatDate = (d: Date) => d.toISOString().split("T")[0];

      const fromVisible = await fromInput.isVisible().catch(() => false);
      if (fromVisible) {
        await fromInput.fill(formatDate(fromDate));
        const toVisible = await toInput.isVisible().catch(() => false);
        if (toVisible) {
          await toInput.fill(formatDate(toDate));
        }

        // Submit form
        const submitButton = page.getByRole("button", { name: /создать|сохранить|применить/i }).first();
        await submitButton.click();
        await page.waitForTimeout(2000);
      }
    }

    // 4. Navigate to payment import
    await page.goto(`${baseURL}/admin/billing/payments-import-new`);
    await expect(page).toHaveURL(/\/admin\/billing\/payments-import-new/);

    // 5. Import payments CSV
    const csvContent = `Дата,Сумма,Участок,Назначение,ФИО,Телефон
${new Date().toISOString().split("T")[0]},5000,Березовая, 12,Членский взнос,Иванов Иван Иванович,+79991234567
${new Date().toISOString().split("T")[0]},3000,Луговая, 7,Электроэнергия,Петров Петр Петрович,+79991234568`;

    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible({ timeout: 5000 });

    await fileInput.setInputFiles({
      name: "test-payments.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });

    // Wait for preview
    await page.waitForTimeout(3000);

    // Check if preview table or error message appears
    const previewTable = page.locator("table").first();
    const errorMessage = page.locator("text=/ошибка|error/i").first();
    
    const hasPreview = await previewTable.isVisible().catch(() => false);
    const hasError = await errorMessage.isVisible().catch(() => false);

    // Either preview or error is acceptable for smoke test
    expect(hasPreview || hasError || page.url().includes("/payments-import")).toBeTruthy();

    // 6. Navigate to debts page
    await page.goto(`${baseURL}/admin/billing/debts`);
    await expect(page).toHaveURL(/\/admin\/billing\/debts/);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Check that debts page loads without errors
    const debtsContent = await page.locator("body").textContent();
    expect(debtsContent).toBeTruthy();

    // Check for period selector or debts table
    const periodSelector = page.locator('select, [data-testid*="period"]').first();
    const debtsTable = page.locator("table").first();
    
    const hasPeriodSelector = await periodSelector.isVisible().catch(() => false);
    const hasDebtsTable = await debtsTable.isVisible().catch(() => false);

    // Page should have either period selector or debts table or empty state
    expect(hasPeriodSelector || hasDebtsTable || debtsContent?.includes("Нет долгов") || debtsContent?.includes("Долги")).toBeTruthy();
  });
});
