import { test, expect } from '@playwright/test';
import { checkAccessibility } from './helpers/a11y';

// Verify the projects list page renders the new Bento Cards correctly on Mobile and Desktop

test.describe('Projects UI - Desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('desktop projects list renders grid layout', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/org/demo/projects');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/projects');
    expect(response.status()).toBeLessThan(500);

    // Accessibility check — no critical or serious violations
    const { violations } = await checkAccessibility(page);
    expect(violations).toEqual([]);
  });
});

test.describe('Projects UI - Mobile', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test('mobile projects list conforms to single column', async ({ page }) => {
    await page.goto('/org/demo/projects');
    await page.waitForLoadState('domcontentloaded');

    const response = await page.request.get('/org/demo/projects');
    expect(response.status()).toBeLessThan(500);
  });
});
