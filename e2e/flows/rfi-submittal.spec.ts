import { expect, test } from '@playwright/test';

import { assertAuthenticated, signIn } from '../helpers/auth';
import { orgUrl } from '../helpers/fixtures';

test.describe('RFI and Submittals', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await assertAuthenticated(page);
  });

  /**
   * Navigate to the first project and verify RFIs are reachable.
   * RFIs live at /projects/[id]/rfis.
   */
  test('projects list loads — prerequisite for RFI navigation', async ({ page }) => {
    await page.goto(orgUrl('/projects'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('navigate to first project RFIs page', async ({ page }) => {
    await page.goto(orgUrl('/projects'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Click first project row or card
    const firstProject = page
      .locator('table tbody tr')
      .first()
      .or(page.locator('[data-testid="project-card"]').first());

    if (!(await firstProject.isVisible({ timeout: 8000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstProject.click();

    // Navigate to RFIs sub-route
    const rfiLink = page
      .getByRole('link', { name: /rfi/i })
      .or(page.getByRole('tab', { name: /rfi/i }));

    if (await rfiLink.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await rfiLink.first().click();
    } else {
      // Direct URL — extract project ID from current URL
      const url = page.url();
      const match = url.match(/projects\/([^/]+)/);
      if (match) {
        await page.goto(orgUrl(`/projects/${match[1]}/rfis`));
      }
    }

    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('RFI list renders or shows empty state', async ({ page }) => {
    // Navigate directly — use a known project route pattern
    await page.goto(orgUrl('/projects'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 8000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstRow.click();
    const url = page.url();
    const match = url.match(/projects\/([^/]+)/);
    if (!match) {
      test.skip();
      return;
    }

    await page.goto(orgUrl(`/projects/${match[1]}/rfis`));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    const hasContent =
      (await page.locator('table').first().isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await page
        .getByText(/no rfis|empty|no results|request for information/i)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false)) ||
      (await page.getByRole('button', { name: /new rfi|create rfi|add rfi/i }).isVisible({ timeout: 3000 }).catch(() => false));

    expect(hasContent).toBe(true);
  });

  test('submittals page renders for a project', async ({ page }) => {
    await page.goto(orgUrl('/projects'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 8000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstRow.click();
    const url = page.url();
    const match = url.match(/projects\/([^/]+)/);
    if (!match) {
      test.skip();
      return;
    }

    await page.goto(orgUrl(`/projects/${match[1]}/submittals`));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('RFI attachment upload UI element is present', async ({ page }) => {
    await page.goto(orgUrl('/projects'));
    const firstRow = page.locator('table tbody tr').first();
    if (!(await firstRow.isVisible({ timeout: 8000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await firstRow.click();
    const url = page.url();
    const match = url.match(/projects\/([^/]+)/);
    if (!match) {
      test.skip();
      return;
    }

    await page.goto(orgUrl(`/projects/${match[1]}/rfis`));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Check for "New RFI" button — the attachment UI lives inside the create form
    const newRfiBtn = page.getByRole('button', { name: /new rfi|create rfi|add rfi/i });
    if (!(await newRfiBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    await newRfiBtn.click();

    // Attachment upload element should exist somewhere in the form/dialog
    const hasAttachment =
      (await page.locator('input[type="file"]').isVisible({ timeout: 5000 }).catch(() => false)) ||
      (await page
        .getByText(/attach|upload|file/i)
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false));

    expect(hasAttachment).toBe(true);
  });
});
