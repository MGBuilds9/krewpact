import { expect, test } from '@playwright/test';

import { signIn } from './helpers/auth';

test.describe('Auth smoke tests', () => {
  test('authenticated user lands on dashboard with nav elements', async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/dashboard|org\//);
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('unauthenticated request redirects to sign-in', async ({ page }) => {
    const response = await page.goto('/dashboard');
    // Should redirect to sign-in or return non-500
    expect(response?.status()).toBeLessThan(500);
    await expect(page).toHaveURL(/sign-in/);
  });

  test('major route groups do not return 500 errors', async ({ page }) => {
    const routes = ['/dashboard', '/sign-in'];
    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(500);
    }
  });
});
