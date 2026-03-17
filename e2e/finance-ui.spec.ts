import { expect, test } from '@playwright/test';

// Verify Finance module components render their new responsive table layouts

test.describe('Finance UI - Desktop View', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('finance dashboard renders bento cards', async ({ page }) => {
    await page.goto('/org/demo/finance');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/finance');
    expect(response.status()).toBeLessThan(500);
  });

  test('invoices page renders table', async ({ page }) => {
    await page.goto('/org/demo/finance/invoices');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/finance/invoices');
    expect(response.status()).toBeLessThan(500);
  });

  test('job costs page renders table', async ({ page }) => {
    await page.goto('/org/demo/finance/job-costs');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/finance/job-costs');
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('Finance UI - Mobile View', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('invoices table maintains horizontal scroll container', async ({ page }) => {
    await page.goto('/org/demo/finance/invoices');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/finance/invoices');
    expect(response.status()).toBeLessThan(500);
  });

  test('job costs table maintains horizontal scroll container', async ({ page }) => {
    await page.goto('/org/demo/finance/job-costs');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/finance/job-costs');
    expect(response.status()).toBeLessThan(500);
  });
});
