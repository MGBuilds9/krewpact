import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers/a11y';

/**
 * Dedicated accessibility test suite for KrewPact key pages.
 * Uses @axe-core/playwright to detect WCAG violations.
 * Only critical and serious violations fail the test.
 *
 * Tag: @a11y — use `npx playwright test --grep @a11y` to run only these.
 */

test.describe('Accessibility - Key Pages @a11y', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('dashboard page has no critical a11y violations', async ({ page }) => {
    await page.goto('/org/demo/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('CRM leads list has no critical a11y violations', async ({ page }) => {
    await page.goto('/org/demo/crm/leads');
    await page.waitForLoadState('domcontentloaded');

    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('CRM lead creation form has no critical a11y violations', async ({ page }) => {
    await page.goto('/org/demo/crm/leads/new');
    await page.waitForLoadState('domcontentloaded');

    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('estimates list has no critical a11y violations', async ({ page }) => {
    await page.goto('/org/demo/estimates');
    await page.waitForLoadState('domcontentloaded');

    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('projects list has no critical a11y violations', async ({ page }) => {
    await page.goto('/org/demo/projects');
    await page.waitForLoadState('domcontentloaded');

    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('settings page has no critical a11y violations', async ({ page }) => {
    await page.goto('/org/demo/settings');
    await page.waitForLoadState('domcontentloaded');

    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});

test.describe('Accessibility - Mobile Views @a11y', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('mobile dashboard has no critical a11y violations', async ({ page }) => {
    await page.goto('/org/demo/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('mobile leads list has no critical a11y violations', async ({ page }) => {
    await page.goto('/org/demo/crm/leads');
    await page.waitForLoadState('domcontentloaded');

    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});
