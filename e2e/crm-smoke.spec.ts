import { expect, test } from '@playwright/test';

import { checkAccessibility } from './helpers/a11y';

test.describe('CRM smoke tests', () => {
  test('leads page loads without errors', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBeLessThan(500);
  });

  test('/org/mdm-group/crm redirects to crm/dashboard, not crm/leads', async ({ page }) => {
    await page.goto('/org/mdm-group/crm');
    // Follow any redirects, then check final URL
    await page.waitForURL(/crm\/dashboard|auth/, { timeout: 10000 });
    const url = page.url();
    // Should land on CRM dashboard (or auth page if unauthenticated), never on /crm/leads
    expect(url).not.toContain('/crm/leads');
    if (!url.includes('/auth')) {
      expect(url).toContain('/crm/dashboard');
    }
  });

  test('command palette opens with keyboard shortcut', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(500);
  });

  test('accessibility check', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});
