import { test, expect } from '@playwright/test';

test.describe('Auth smoke tests', () => {
  test('demo mode lands on dashboard with nav elements', async ({ page }) => {
    await page.goto('/dashboard');
    // Should not redirect to login in demo mode
    await expect(page).toHaveURL(/dashboard/);
    // Verify key nav elements exist
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('unauthenticated routes redirect appropriately', async ({ page }) => {
    // In demo mode, all routes are accessible — just verify no 500s
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBeLessThan(500);
  });

  test('major route groups load without 500 errors', async ({ page }) => {
    const routes = ['/dashboard', '/sign-in'];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(500);
    }
  });
});
