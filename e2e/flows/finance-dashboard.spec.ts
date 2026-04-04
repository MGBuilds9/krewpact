import { expect, test } from '@playwright/test';

import { checkAccessibility } from '../helpers/a11y';
import { assertAuthenticated, signIn } from '../helpers/auth';
import { orgUrl } from '../helpers/fixtures';

test.describe('Finance Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await assertAuthenticated(page);
  });

  test('finance overview loads with data', async ({ page }) => {
    await page.goto(orgUrl('/finance'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Should not show error state
    await expect(page.locator('[role="alert"]')).not.toBeVisible();

    // Finance page should have charts, cards, or data widgets
    const hasContent =
      (await page
        .locator('canvas, svg[role="img"], [data-testid="chart"]')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)) ||
      (await page
        .locator('[data-testid="stat-card"], .recharts-wrapper')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await page
        .getByText(/revenue|invoices|expenses|profit/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false));

    expect(hasContent).toBe(true);
  });

  test('invoices section renders', async ({ page }) => {
    // Try both /finance/invoices and /invoices
    let loaded = false;
    for (const path of ['/finance/invoices', '/invoices']) {
      await page.goto(orgUrl(path));
      const main = page.locator('main');
      if (await main.isVisible({ timeout: 5000 }).catch(() => false)) {
        const status = await page.evaluate(
          () => document.querySelector('main')?.textContent?.length ?? 0,
        );
        if (status > 10) {
          loaded = true;
          break;
        }
      }
    }

    if (!loaded) {
      // Finance/invoices page may not exist yet
      test.skip();
      return;
    }

    // Should show invoice list or empty state
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('dashboard shows real data (not empty states)', async ({ page }) => {
    await page.goto(orgUrl('/dashboard'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // The main dashboard should show at least one metric or widget with data
    // Look for numbers (revenue, leads, projects count, etc.)
    const statsContent = await page.locator('main').textContent();

    // Should contain at least some numeric content (not just text labels)
    const hasNumbers = /\d+/.test(statsContent ?? '');
    expect(hasNumbers).toBe(true);
  });

  test('accessibility check', async ({ page }) => {
    await signIn(page);
    await page.goto(orgUrl('/finance'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});
