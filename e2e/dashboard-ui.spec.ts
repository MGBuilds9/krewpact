import { expect, test } from '@playwright/test';

import { checkAccessibility } from './helpers/a11y';
import { signIn } from './helpers/auth';

test.describe('Dashboard UI & Navigation - Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('desktop dashboard renders with accessible layout', async ({ page }) => {
    await signIn(page);

    // Navigate to dashboard after auth
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/dashboard');
    expect(response.status()).toBeLessThan(500);

    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});

test.describe('Dashboard UI & Navigation - Mobile Field Ops', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('mobile dashboard loads without errors', async ({ page }) => {
    await signIn(page);

    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/dashboard');
    expect(response.status()).toBeLessThan(500);
  });
});
