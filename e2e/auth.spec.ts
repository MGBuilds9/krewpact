import { test, expect } from '@playwright/test';

test.describe('Authentication (Demo Mode)', () => {
  test('loads dashboard without login prompt', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('body')).not.toContainText('Sign in');
  });

  test('dashboard shows main navigation items', async ({ page }) => {
    await page.goto('/dashboard');
    // Check that key nav elements are present
    const body = page.locator('body');
    await expect(body).toContainText(/CRM|Leads|Dashboard/i);
  });

  test('redirects root to dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/(dashboard|crm|auth)/, { timeout: 10_000 });
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|crm)/);
  });
});
