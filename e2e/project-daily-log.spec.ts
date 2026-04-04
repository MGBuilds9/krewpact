import { expect, test } from '@playwright/test';

import { checkAccessibility } from './helpers/a11y';

test.describe('Project Daily Log', () => {
  test('navigate to projects list', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/projects/);
    await expect(page.locator('body')).toContainText(/Project/i);
  });

  test('projects page loads without error', async ({ page }) => {
    const response = await page.goto('/projects');
    expect(response?.status()).toBeLessThan(500);
  });

  test('new project page renders form', async ({ page }) => {
    await page.goto('/projects/new');
    // Should have a form for creating a project
    const body = page.locator('body');
    await expect(body).toContainText(/project|create|new/i);
  });

  test('accessibility check', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});
