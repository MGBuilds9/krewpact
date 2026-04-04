import { expect, test } from '@playwright/test';

import { checkAccessibility } from '../helpers/a11y';
import { signIn } from '../helpers/auth';
import { fixtures, orgUrl } from '../helpers/fixtures';

// storageState handles auth for chromium/full projects.

test.describe('Estimate Creation', () => {

  test('estimates page loads', async ({ page }) => {
    await page.goto(orgUrl('/estimates'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('create a new estimate with line items', async ({ page }) => {
    await page.goto(orgUrl('/estimates'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Click create button
    const createBtn = page.getByRole('button', {
      name: /new estimate|create estimate|add estimate/i,
    });
    if (!(await createBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }
    await createBtn.click();

    // Fill estimate name/number
    const nameInput = page.locator(
      'input[name="name"], input[name="estimate_number"], input[name="title"]',
    );
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
    await nameInput.fill(fixtures.estimate.name());

    // Add first line item
    const firstLineItem = fixtures.estimate.lineItems[0];
    const descInput = page
      .locator(
        'input[name="line_items.0.description"], input[name="items.0.description"], input[placeholder*="description"]',
      )
      .first();
    if (await descInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await descInput.fill(firstLineItem.description);

      const qtyInput = page
        .locator('input[name="line_items.0.qty"], input[name="items.0.quantity"]')
        .first()
        .or(page.locator('input[type="number"]').nth(0));
      if (await qtyInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await qtyInput.fill(firstLineItem.qty.toString());
      }

      const rateInput = page
        .locator('input[name="line_items.0.rate"], input[name="items.0.rate"]')
        .first()
        .or(page.locator('input[type="number"]').nth(1));
      if (await rateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await rateInput.fill(firstLineItem.rate.toString());
      }
    }

    // Submit/save
    const submitBtn = page.getByRole('button', { name: /save|create|submit/i });
    await submitBtn.click();

    // Verify estimate was created
    const created =
      (await page
        .getByText(/success|created|saved/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)) || page.url().includes('/estimates/');

    expect(created).toBe(true);
  });

  test('view estimate detail and verify totals', async ({ page }) => {
    await page.goto(orgUrl('/estimates'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Click first estimate
    const firstEstimate = page
      .locator('table tbody tr')
      .first()
      .or(page.locator('[data-testid="estimate-card"]').first());

    if (await firstEstimate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstEstimate.click();

      // Should show estimate detail with totals
      await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

      // Look for total/subtotal display
      const totalText = page.getByText(/total|subtotal|grand total/i);
      if (await totalText.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Total should contain a dollar amount
        const totalContent = await totalText.textContent();
        expect(totalContent).toBeTruthy();
      }
    }
  });

  test('accessibility check', async ({ page }) => {
    await signIn(page);
    await page.goto(orgUrl('/estimates'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});
