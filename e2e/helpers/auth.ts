import { expect, type Page } from '@playwright/test';

/**
 * Clerk test user authentication helper.
 *
 * Requires env vars:
 *   CLERK_TEST_EMAIL — test user email
 *   CLERK_TEST_PASSWORD — test user password
 *   CLERK_TEST_CODE — test verification code
 *
 * Uses Clerk's hosted sign-in page flow.
 */

export async function signIn(page: Page): Promise<void> {
  const email = process.env.CLERK_TEST_EMAIL;
  const password = process.env.CLERK_TEST_PASSWORD;
  const code = process.env.CLERK_TEST_CODE;

  if (!email || (!password && !code)) {
    throw new Error(
      'CLERK_TEST_EMAIL and either CLERK_TEST_PASSWORD or CLERK_TEST_CODE must be set for authenticated E2E tests',
    );
  }

  // Navigate to sign-in
  await page.goto('/sign-in');

  if (/dashboard|org\//.test(page.url())) {
    return;
  }

  // Clerk renders its own UI — wait for the email input
  const emailInput = page.locator('input[name="identifier"], input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(email);

  // Click continue
  const continueBtn = page.getByRole('button', { name: /^continue$/i });
  await continueBtn.click();

  if (code) {
    const codeMethodBtn = page
      .getByRole('button', {
        name: /email code|verification code|continue with email code|use email code/i,
      })
      .first();

    if (await codeMethodBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await codeMethodBtn.click();
    }

    const codeInputs = page.locator(
      'input[autocomplete="one-time-code"], input[name*="code"], input[inputmode="numeric"]',
    );

    if (
      await codeInputs
        .first()
        .isVisible({ timeout: 10_000 })
        .catch(() => false)
    ) {
      const inputCount = await codeInputs.count();
      if (inputCount > 1) {
        for (const [index, digit] of [...code].entries()) {
          await codeInputs.nth(index).fill(digit);
        }
      } else {
        await codeInputs.first().fill(code);
      }
    } else if (password) {
      const passwordInput = page.locator('input[type="password"]');
      await expect(passwordInput).toBeVisible({ timeout: 10_000 });
      await passwordInput.fill(password);
      const signInBtn = page.getByRole('button', { name: /continue|sign in|log in/i });
      await signInBtn.click();
      await page.waitForURL(/dashboard|org\//, { timeout: 20_000 });
      return;
    } else {
      throw new Error('Clerk did not present a verification-code input after identifier entry');
    }

    const verifyBtn = page
      .getByRole('button', { name: /continue|verify|submit|sign in|log in/i })
      .first();
    if (await verifyBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await verifyBtn.click();
    }
  } else {
    // Wait for password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });
    await passwordInput.fill(password!);

    // Click sign in
    const signInBtn = page.getByRole('button', { name: /continue|sign in|log in/i });
    await signInBtn.click();
  }

  // Wait for redirect to dashboard
  await page.waitForURL(/dashboard|org\//, { timeout: 20_000 });
}

/**
 * Verify the user is authenticated by checking for dashboard elements.
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 10_000 });
  // Should not be on sign-in page
  expect(page.url()).not.toContain('/sign-in');
}

/**
 * Sign out the current user.
 */
export async function signOut(page: Page): Promise<void> {
  // Click user button to open Clerk user menu
  const userButton = page.locator('.cl-userButtonTrigger, [data-clerk-user-button]');
  if (await userButton.isVisible()) {
    await userButton.click();
    const signOutBtn = page.getByText(/sign out/i);
    if (await signOutBtn.isVisible({ timeout: 3000 })) {
      await signOutBtn.click();
      await page.waitForURL(/sign-in/, { timeout: 10_000 });
    }
  }
}
