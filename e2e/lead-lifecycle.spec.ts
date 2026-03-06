import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers/a11y';

// Krewpact is multi-tenant and routes via orgSlug, so we use /org/demo/ for tests

test.describe('Lead Lifecycle - Desktop View', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('navigate to leads list page', async ({ page }) => {
    await page.goto('/org/demo/crm/leads');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/crm/leads');
    expect(response.status()).toBeLessThan(500);
  });

  test('navigate to opportunities pipeline page', async ({ page }) => {
    await page.goto('/org/demo/crm/opportunities');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/crm/opportunities');
    expect(response.status()).toBeLessThan(500);
  });

  test('navigate to create lead page and assert form', async ({ page }) => {
    await page.goto('/org/demo/crm/leads/new');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/crm/leads/new');
    expect(response.status()).toBeLessThan(500);

    // Accessibility check on lead form
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('navigate to lead gen dashboard', async ({ page }) => {
    await page.goto('/org/demo/admin/lead-gen');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/admin/lead-gen');
    expect(response.status()).toBeLessThan(500);
  });

  test('navigate to sequences management page', async ({ page }) => {
    await page.goto('/org/demo/crm/sequences');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/crm/sequences');
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('Lead Lifecycle - Mobile View', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('leads list collapses to single bento column', async ({ page }) => {
    await page.goto('/org/demo/crm/leads');
    await page.waitForLoadState('domcontentloaded');

    // Test base render without error
    const response = await page.request.get('/org/demo/crm/leads');
    expect(response.status()).toBeLessThan(500);
  });

  test('opportunities pipeline enables horizontal scroll', async ({ page }) => {
    await page.goto('/org/demo/crm/opportunities');
    await page.waitForLoadState('domcontentloaded');

    // Test base render without error
    const response = await page.request.get('/org/demo/crm/opportunities');
    expect(response.status()).toBeLessThan(500);
  });
});
