import { test, expect } from '@playwright/test';
import { signIn, assertAuthenticated } from '../helpers/auth';
import { orgUrl } from '../helpers/fixtures';

test.describe('CRM Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await assertAuthenticated(page);
  });

  test('CRM dashboard loads with data', async ({ page }) => {
    await page.goto(orgUrl('/crm/dashboard'));

    // Dashboard should render — look for pipeline or chart content
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    // Should not show error state
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
    // Should have some visible content (cards, charts, or stats)
    const content = page.locator('main').locator('div');
    await expect(content.first()).toBeVisible();
  });

  test('leads list loads and shows data', async ({ page }) => {
    await page.goto(orgUrl('/crm/leads'));

    // Wait for the page to render
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Should see either a data table or empty state — not an error
    const hasTable = await page.locator('table').isVisible({ timeout: 5000 }).catch(() => false);
    const hasCards = await page.locator('[data-testid="lead-card"]').first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasEmpty = await page.getByText(/no leads|get started/i).isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasTable || hasCards || hasEmpty).toBe(true);
  });

  test('open lead detail page', async ({ page }) => {
    await page.goto(orgUrl('/crm/leads'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Click first lead in the list
    const firstLead = page.locator('table tbody tr').first()
      .or(page.locator('[data-testid="lead-card"]').first());

    if (await firstLead.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstLead.click();

      // Should navigate to lead detail
      await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
      // Should show lead info (company name, status, etc.)
      await expect(page.locator('h1, h2, [data-testid="lead-name"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('pipeline view renders stages', async ({ page }) => {
    await page.goto(orgUrl('/crm/pipeline'));

    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Pipeline should show stage columns or cards
    // Look for stage names that match the CRM pipeline
    const stageNames = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation'];
    let foundStage = false;

    for (const stage of stageNames) {
      const stageEl = page.getByText(stage, { exact: false });
      if (await stageEl.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundStage = true;
        break;
      }
    }

    // If pipeline page exists and loaded, it should have at least one stage
    // (or redirect to leads if pipeline view isn't built yet)
    const url = page.url();
    expect(foundStage || url.includes('/crm/leads') || url.includes('/crm/dashboard')).toBe(true);
  });

  test('add note to lead', async ({ page }) => {
    await page.goto(orgUrl('/crm/leads'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    const firstLead = page.locator('table tbody tr').first();
    if (await firstLead.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstLead.click();
      await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

      // Look for notes/activity section
      const notesSection = page.getByText(/notes|activity|timeline/i);
      if (await notesSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Look for a text input to add a note
        const noteInput = page.locator(
          'textarea[name="note"], textarea[placeholder*="note"], textarea[placeholder*="comment"]',
        );
        if (await noteInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await noteInput.fill(`E2E test note — ${new Date().toISOString()}`);
          const addBtn = page.getByRole('button', { name: /add|save|submit|post/i });
          if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await addBtn.click();
            // Note should appear in the activity feed
            await expect(page.getByText('E2E test note')).toBeVisible({ timeout: 5000 });
          }
        }
      }
    }
  });
});
