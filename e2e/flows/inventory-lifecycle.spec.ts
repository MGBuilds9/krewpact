import { expect, test } from '@playwright/test';

import { checkAccessibility } from '../helpers/a11y';
import { assertAuthenticated, signIn } from '../helpers/auth';
import { orgUrl } from '../helpers/fixtures';

test.describe('Inventory Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await assertAuthenticated(page);
  });

  test('inventory overview renders without errors', async ({ page }) => {
    await page.goto(orgUrl('/inventory'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('inventory items list renders', async ({ page }) => {
    await page.goto(orgUrl('/inventory/items'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();

    const hasContent =
      (await page
        .locator('table')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)) ||
      (await page
        .getByText(/no items|empty|no results/i)
        .isVisible({ timeout: 3000 })
        .catch(() => false));
    expect(hasContent).toBe(true);
  });

  test('new item form is reachable', async ({ page }) => {
    await page.goto(orgUrl('/inventory/items/new'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();

    // Should render a form with at least one input
    const hasForm = await page
      .locator('form, input, [role="form"]')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    expect(hasForm).toBe(true);
  });

  test('inventory locations page renders', async ({ page }) => {
    await page.goto(orgUrl('/inventory/locations'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('inventory transactions page renders', async ({ page }) => {
    await page.goto(orgUrl('/inventory/transactions'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('inventory purchase orders page renders', async ({ page }) => {
    await page.goto(orgUrl('/inventory/purchase-orders'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('fleet vehicles page renders', async ({ page }) => {
    await page.goto(orgUrl('/inventory/fleet'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();

    const hasContent =
      (await page
        .locator('table')
        .first()
        .isVisible({ timeout: 5000 })
        .catch(() => false)) ||
      (await page
        .getByText(/vehicle|fleet|no results|empty/i)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false));
    expect(hasContent).toBe(true);
  });

  test('accessibility check', async ({ page }) => {
    await signIn(page);
    await page.goto(orgUrl('/inventory'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});
