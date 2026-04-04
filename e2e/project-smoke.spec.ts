import { expect, test } from '@playwright/test';

import { checkAccessibility } from './helpers/a11y';

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

  test('accessibility check', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});
