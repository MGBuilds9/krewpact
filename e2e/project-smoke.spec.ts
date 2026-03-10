import { test, expect } from '@playwright/test';

test.describe('Project smoke tests', () => {
  test('dashboard loads without 500 error', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBeLessThan(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('sign-in page loads', async ({ page }) => {
    const response = await page.goto('/sign-in');
    expect(response?.status()).toBeLessThan(500);
  });
});
