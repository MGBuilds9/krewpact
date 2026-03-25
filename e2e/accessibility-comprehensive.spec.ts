import { expect, test } from '@playwright/test';

import { checkAccessibility } from './helpers/a11y';
import { assertAuthenticated, signIn } from './helpers/auth';
import { orgUrl } from './helpers/fixtures';

/**
 * Comprehensive accessibility scan across all major KrewPact pages.
 * Uses @axe-core/playwright for WCAG AA compliance (critical + serious violations only).
 *
 * Tag: @a11y — run with: npx playwright test --grep @a11y
 */

test.describe('Accessibility - Authenticated Pages @a11y', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await assertAuthenticated(page);
  });

  test('dashboard has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/dashboard'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('CRM leads list has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/crm/leads'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('projects list has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/projects'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('estimates list has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/estimates'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('finance overview has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/finance'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('finance invoices page has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/finance/invoices'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('inventory items list has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/inventory/items'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('inventory locations page has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/inventory/locations'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('timesheets page has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/timesheets'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('expenses page has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/expenses'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('settings page has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/settings'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('portals management page has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/portals'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('CRM accounts page has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/crm/accounts'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});

test.describe('Accessibility - Public / Portal Pages @a11y', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('sign-in page has no critical a11y violations', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page, {
      // Exclude Clerk-rendered iframe elements outside our control
      exclude: ['.cl-rootBox iframe', '#clerk-hosted-sign-in'],
    });
    expect(violations).toEqual([]);
  });

  test('client portal landing page has no critical a11y violations', async ({ page }) => {
    await page.goto('/portals');
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

  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await assertAuthenticated(page);
  });

  test('mobile dashboard has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/dashboard'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('mobile projects list has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/projects'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('mobile inventory items has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/inventory/items'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });

  test('mobile timesheets page has no critical a11y violations', async ({ page }) => {
    await page.goto(orgUrl('/timesheets'));
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});
