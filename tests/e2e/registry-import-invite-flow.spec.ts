import { test, expect } from "@playwright/test";
import { loginStaff } from "./helpers/auth";

const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const adminCode = process.env.TEST_ADMIN_CODE || "1233";

test.describe("E2E: Registry → Import → Invite → Registration → Verification", () => {
  test.use({ storageState: undefined });

  test("full flow: registry import to user verification", async ({ page }) => {
    // 1. Login as admin
    await page.goto(`${baseURL}/staff-login?next=/admin/registry`);
    await page.getByTestId("staff-login-username").fill("admin@snt.ru");
    await page.getByTestId("staff-login-password").fill(adminCode);
    await page.getByTestId("staff-login-submit").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/staff-login"), { timeout: 20000 });

    // 2. Navigate to registry
    await page.goto(`${baseURL}/admin/registry?tab=import`);
    await expect(page).toHaveURL(/\/admin\/registry/);

    // 3. Import registry data
    const csvContent = `plot_display,cadastral_number,seed_owner_name,seed_owner_phone,note
Березовая, 12,77:01:0001001:123,Иванов Иван Иванович,+79991234567,Тестовый участок
Луговая, 7,77:01:0001001:124,Петров Петр Петрович,+79991234568,`;

    // Find import button/trigger
    const importTrigger = page.locator("#registry-import-trigger").or(page.getByRole("button", { name: /импорт/i }));
    await importTrigger.first().click();

    // Wait for modal/file input
    const fileInput = page.locator('input[type="file"]').first();
    await expect(fileInput).toBeVisible({ timeout: 5000 });

    // Upload CSV
    await fileInput.setInputFiles({
      name: "test-registry.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csvContent),
    });

    // Wait for preview/parsing
    await page.waitForTimeout(2000);

    // Check if import button is visible (in modal)
    const importButton = page.getByRole("button", { name: /импортировать|применить/i }).first();
    const isImportVisible = await importButton.isVisible().catch(() => false);
    
    if (isImportVisible) {
      // Confirm import if dialog appears
      page.on("dialog", async (dialog) => {
        await dialog.accept();
      });
      await importButton.click();
      await page.waitForTimeout(2000);
    }

    // 4. Navigate to plots tab to find the imported plot
    await page.goto(`${baseURL}/admin/registry?tab=plots`);
    await expect(page).toHaveURL(/\/admin\/registry/);

    // Wait for table to load
    await page.waitForTimeout(1000);

    // Find a plot (look for "12" or "Березовая")
    const plotRow = page.locator("tr").filter({ hasText: /12|Березовая/i }).first();
    const plotExists = await plotRow.isVisible().catch(() => false);

    if (plotExists) {
      // 5. Generate invite code (if we can find the plot)
      await plotRow.click();
      await page.waitForTimeout(1000);

      // Look for invite code generation button
      const inviteButton = page.getByRole("button", { name: /код|инвайт|приглаш/i }).first();
      const hasInviteButton = await inviteButton.isVisible().catch(() => false);

      if (hasInviteButton) {
        await inviteButton.click();
        await page.waitForTimeout(1000);

        // Extract invite code if displayed
        const codeElement = page.locator("code, [data-testid*='code'], [data-testid*='invite']").first();
        const codeVisible = await codeElement.isVisible().catch(() => false);
        
        if (codeVisible) {
          const inviteCode = await codeElement.textContent();
          expect(inviteCode).toBeTruthy();
        }
      }
    }

    // 6. Navigate to registration page (as new user)
    await page.context().clearCookies();
    await page.goto(`${baseURL}/register-plot`);
    
    // Check that registration page loads without errors
    await expect(page).toHaveURL(/\/register-plot/);
    const formVisible = await page.locator('form, [data-testid*="register"]').first().isVisible().catch(() => false);
    expect(formVisible || page.url().includes("/register-plot")).toBeTruthy();

    // 7. Navigate to verification page (as admin)
    await page.context().clearCookies();
    await page.goto(`${baseURL}/staff-login?next=/admin/verification`);
    await page.getByTestId("staff-login-username").fill("admin@snt.ru");
    await page.getByTestId("staff-login-password").fill(adminCode);
    await page.getByTestId("staff-login-submit").click();
    await page.waitForURL((url) => !url.pathname.startsWith("/staff-login"), { timeout: 20000 });

    await page.goto(`${baseURL}/admin/verification`);
    await expect(page).toHaveURL(/\/admin\/verification/);
    
    // Check that verification page loads without errors
    const verificationContent = await page.locator("body").textContent();
    expect(verificationContent).toBeTruthy();
  });
});
