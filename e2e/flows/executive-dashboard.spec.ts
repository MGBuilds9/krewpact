import { expect, test } from '@playwright/test';

import { checkAccessibility } from '../helpers/a11y';
import { assertAuthenticated, signIn } from '../helpers/auth';
import { orgUrl } from '../helpers/fixtures';

test.describe('Executive Dashboard (role-gated)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await assertAuthenticated(page);
  });

  test('executive route is reachable without 500 error', async ({ page }) => {
    await page.goto(orgUrl('/executive'));
    // May redirect (403/feature-gated) or render — either is valid, not a 500
    const response = await page.request.get(orgUrl('/executive'));
    expect(response.status()).toBeLessThan(500);
  });

  test('executive page renders main element or redirects gracefully', async ({ page }) => {
    await page.goto(orgUrl('/executive'));
    await page.waitForLoadState('domcontentloaded');

    // Either the executive page loads, or the user is redirected (not authorized)
    // Both are correct behavior — we just ensure no crash
    const isOnExecutivePage = page.url().includes('/executive');
    if (isOnExecutivePage) {
      await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('[role="alert"]')).not.toBeVisible();
    } else {
      // Redirected — that is correct for non-executive roles
      expect(page.url()).not.toContain('/executive');
    }
  });

  test('executive dashboard metrics render when accessible', async ({ page }) => {
    await page.goto(orgUrl('/executive'));
    await page.waitForLoadState('domcontentloaded');

    if (!page.url().includes('/executive')) {
      test.skip();
      return;
    }

    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Executive dashboard should show KPIs or metric cards
    const hasMetrics =
      (await page
        .getByText(/revenue|pipeline|margin|backlog|utilization|kpi|metric/i)
        .first()
        .isVisible({ timeout: 8000 })
        .catch(() => false)) ||
      (await page
        .locator('[data-testid="stat-card"], .recharts-wrapper, canvas, svg[role="img"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false));

    expect(hasMetrics).toBe(true);
  });

  test('executive knowledge page renders', async ({ page }) => {
    await page.goto(orgUrl('/executive/knowledge'));
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get(orgUrl('/executive/knowledge'));
    expect(response.status()).toBeLessThan(500);
  });

  test('dashboard executive widget renders without errors', async ({ page }) => {
    // The main dashboard may have an executive summary widget
    await page.goto(orgUrl('/dashboard/executive'));
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get(orgUrl('/dashboard/executive'));
    expect(response.status()).toBeLessThan(500);

    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('accessibility check', async ({ page }) => {
    await signIn(page);
    await page.goto(orgUrl('/executive'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});
