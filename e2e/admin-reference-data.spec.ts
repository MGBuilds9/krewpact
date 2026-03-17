import { expect, test } from '@playwright/test';

test.describe('Admin Reference Data', () => {
  test('navigate to admin governance page', async ({ page }) => {
    await page.goto('/admin/governance');
    const _response = await page.waitForLoadState('domcontentloaded');
    // Page should load (may show empty state or data)
    const body = page.locator('body');
    await expect(body).toContainText(/governance|reference|admin|data/i);
  });

  test('navigate to settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
    const body = page.locator('body');
    await expect(body).toContainText(/setting/i);
  });

  test('admin system page loads', async ({ page }) => {
    const response = await page.goto('/admin/system');
    expect(response?.status()).toBeLessThan(500);
  });
});
