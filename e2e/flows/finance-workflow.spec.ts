import { expect, test } from '@playwright/test';

import { assertAuthenticated, signIn } from '../helpers/auth';
import { orgUrl } from '../helpers/fixtures';

test.describe('Finance Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await assertAuthenticated(page);
  });

  test('finance overview renders without errors', async ({ page }) => {
    await page.goto(orgUrl('/finance'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('invoices page renders table', async ({ page }) => {
    await page.goto(orgUrl('/finance/invoices'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();

    // Should show a table or empty state — not a blank screen
    const hasContent =
      (await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await page
        .getByText(/no invoices|empty|no results/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false));
    expect(hasContent).toBe(true);
  });

  test('purchase orders page renders', async ({ page }) => {
    await page.goto(orgUrl('/finance/purchase-orders'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('job costs page renders', async ({ page }) => {
    await page.goto(orgUrl('/finance/job-costs'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('finance overview contains key financial metrics or labels', async ({ page }) => {
    await page.goto(orgUrl('/finance'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    const hasMetrics =
      (await page
        .getByText(/invoice|revenue|payable|receivable|holdback|payment|expense/i)
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)) ||
      (await page
        .locator('[data-testid="stat-card"], .recharts-wrapper, canvas')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false));

    expect(hasMetrics).toBe(true);
  });

  test('invoices page does not expose raw UUIDs in visible text', async ({ page }) => {
    await page.goto(orgUrl('/finance/invoices'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    const bodyText = (await page.locator('main').textContent()) ?? '';
    // Raw UUIDs should not appear as standalone visible text (production hardening rule)
    const rawUuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
    expect(rawUuidPattern.test(bodyText)).toBe(false);
  });
});
