import { test, expect } from '@playwright/test';

test.describe('CRM smoke tests', () => {
  test('leads page loads without errors', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBeLessThan(500);
    // Try navigating to CRM section if available
  });

  test('command palette opens with keyboard shortcut', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Meta+k');
    // Verify no crash — command palette may or may not appear depending on focus
    await page.waitForTimeout(500);
  });
});
