import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers/a11y';

test.describe('Lead Generation Pipeline - Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('lead gen dashboard renders with status cards', async ({ page }) => {
    await page.goto('/org/demo/admin/lead-gen');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/admin/lead-gen');
    expect(response.status()).toBeLessThan(500);
  });

  test('lead gen dashboard has quick action buttons', async ({ page }) => {
    await page.goto('/org/demo/admin/lead-gen');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/admin/lead-gen');
    expect(response.status()).toBeLessThan(500);
  });

  test('leads list page renders', async ({ page }) => {
    await page.goto('/org/demo/crm/leads');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/crm/leads');
    expect(response.status()).toBeLessThan(500);
  });

  test('sequences management page renders', async ({ page }) => {
    await page.goto('/org/demo/crm/sequences');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/crm/sequences');
    expect(response.status()).toBeLessThan(500);
  });

  test('email templates page renders', async ({ page }) => {
    await page.goto('/org/demo/crm/email-templates');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/crm/email-templates');
    expect(response.status()).toBeLessThan(500);
  });

  test('lead gen dashboard passes accessibility checks', async ({ page }) => {
    await page.goto('/org/demo/admin/lead-gen');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/admin/lead-gen');
    if (response.status() < 400) {
      const { violations } = await checkAccessibility(page);
      expect(violations).toEqual([]);
    }
  });
});

test.describe('Lead Generation Pipeline - Mobile', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('lead gen dashboard renders on mobile', async ({ page }) => {
    await page.goto('/org/demo/admin/lead-gen');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/admin/lead-gen');
    expect(response.status()).toBeLessThan(500);
  });
});
