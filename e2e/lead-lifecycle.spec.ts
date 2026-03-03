import { test, expect } from '@playwright/test';

test.describe('Lead Lifecycle', () => {
  test('navigate to leads list page', async ({ page }) => {
    await page.goto('/crm/leads');
    await expect(page).toHaveURL(/\/crm\/leads/);
    // Should render the leads page with a heading or table
    await expect(page.locator('body')).toContainText(/Lead/i);
  });

  test('navigate to create lead page', async ({ page }) => {
    await page.goto('/crm/leads/new');
    await expect(page).toHaveURL(/\/crm\/leads\/new/);
    // Should show a form
    await expect(page.locator('form, [role="form"]').first()).toBeVisible();
  });

  test('lead form has required fields', async ({ page }) => {
    await page.goto('/crm/leads/new');
    // Lead forms require company_name and source_channel at minimum
    const companyField = page.locator('input[name="company_name"], [name="company_name"]').first();
    await expect(companyField).toBeVisible();
  });

  test('submit empty lead form shows validation errors', async ({ page }) => {
    await page.goto('/crm/leads/new');
    // Try to submit empty form
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible()) {
      await submitButton.click();
      // Should show validation error messages (Zod shows "Too small" for min-length violations)
      await expect(page.locator('body')).toContainText(/required|invalid|error|too small/i);
    }
  });
});
