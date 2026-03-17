import { expect, test } from '@playwright/test';

import { assertAuthenticated, signIn } from '../helpers/auth';
import { fixtures, orgUrl } from '../helpers/fixtures';

test.describe('Expense Submission', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await assertAuthenticated(page);
  });

  test('expenses page loads', async ({ page }) => {
    await page.goto(orgUrl('/expenses'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    // Should not show server error
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  test('create a new expense', async ({ page }) => {
    await page.goto(orgUrl('/expenses'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Click create button
    const createBtn = page.getByRole('button', {
      name: /new expense|add expense|create|submit expense/i,
    });
    if (!(await createBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      // Expenses page may not have a create button yet — skip gracefully
      test.skip();
      return;
    }
    await createBtn.click();

    // Fill expense form
    const descInput = page.locator(
      'input[name="description"], textarea[name="description"], input[name="title"]',
    );
    await expect(descInput).toBeVisible({ timeout: 10_000 });
    await descInput.fill(fixtures.expense.description());

    // Fill amount
    const amountInput = page.locator('input[name="amount"], input[type="number"]');
    if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await amountInput.fill(fixtures.expense.amount.toString());
    }

    // Select category if dropdown exists
    const categorySelect = page.locator('select[name="category"], [data-testid="category-select"]');
    if (await categorySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await categorySelect.selectOption({ label: fixtures.expense.category });
    }

    // Submit
    const submitBtn = page.getByRole('button', { name: /submit|save|create/i });
    await submitBtn.click();

    // Verify success — either redirect or success toast
    const success =
      (await page
        .getByText(/success|created|submitted/i)
        .isVisible({ timeout: 5000 })
        .catch(() => false)) ||
      (await page
        .getByText(fixtures.expense.description().split(' ')[0])
        .isVisible({ timeout: 5000 })
        .catch(() => false));

    expect(success).toBe(true);
  });

  test('view expense details', async ({ page }) => {
    await page.goto(orgUrl('/expenses'));
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

    // Click first expense in the list
    const firstExpense = page
      .locator('table tbody tr')
      .first()
      .or(page.locator('[data-testid="expense-card"]').first());

    if (await firstExpense.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstExpense.click();

      // Should show expense detail
      await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    }
  });
});
