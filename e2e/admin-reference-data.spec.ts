import { expect, test } from '@playwright/test';

import { checkAccessibility } from './helpers/a11y';

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

  test('accessibility check', async ({ page }) => {
    await page.goto('/admin/governance');
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});
