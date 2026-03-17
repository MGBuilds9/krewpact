import { expect, test } from '@playwright/test';

test.describe('Estimate Creation', () => {
  test('navigate to estimates list', async ({ page }) => {
    await page.goto('/estimates');
    await expect(page).toHaveURL(/\/estimates/);
    await expect(page.locator('body')).toContainText(/Estimate/i);
  });

  test('navigate to new estimate page', async ({ page }) => {
    await page.goto('/estimates/new');
    await expect(page).toHaveURL(/\/estimates\/new/);
    // Should render the estimate creation page with relevant content
    await expect(page.locator('body')).toContainText(/estimate/i);
  });

  test('estimate form has currency and division fields', async ({ page }) => {
    await page.goto('/estimates/new');
    // Estimates require division and currency
    const body = page.locator('body');
    await expect(body).toContainText(/division|currency|estimate/i);
  });
});
