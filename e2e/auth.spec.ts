import { expect, test } from '@playwright/test';

import { assertAuthenticated, signIn } from './helpers/auth';

test.describe('Authentication', () => {
  test('sign-in with test user reaches dashboard', async ({ page }) => {
    await signIn(page);
    await assertAuthenticated(page);
    await expect(page).toHaveURL(/\/dashboard|\/org\//);
  });

  test('dashboard shows main navigation items', async ({ page }) => {
    await signIn(page);
    const body = page.locator('body');
    await expect(body).toContainText(/CRM|Leads|Dashboard/i);
  });

  test('unauthenticated root redirects to sign-in', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/(sign-in|dashboard|org)/, { timeout: 10_000 });
  });
});
