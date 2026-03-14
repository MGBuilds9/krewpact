import { type Page, expect } from '@playwright/test';

/**
 * Clerk test user authentication helper.
 *
 * Requires env vars:
 *   CLERK_TEST_EMAIL — test user email
 *   CLERK_TEST_PASSWORD — test user password
 *
 * Uses Clerk's hosted sign-in page flow.
 */

export async function signIn(page: Page): Promise<void> {
  const email = process.env.CLERK_TEST_EMAIL;
  const password = process.env.CLERK_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'CLERK_TEST_EMAIL and CLERK_TEST_PASSWORD must be set for authenticated E2E tests',
    );
  }

  // Navigate to sign-in
  await page.goto('/sign-in');

  // Clerk renders its own UI — wait for the email input
  const emailInput = page.locator('input[name="identifier"], input[type="email"]');
  await expect(emailInput).toBeVisible({ timeout: 15_000 });
  await emailInput.fill(email);

  // Click continue
  const continueBtn = page.getByRole('button', { name: /continue/i });
  await continueBtn.click();

  // Wait for password input
  const passwordInput = page.locator('input[type="password"]');
  await expect(passwordInput).toBeVisible({ timeout: 10_000 });
  await passwordInput.fill(password);

  // Click sign in
  const signInBtn = page.getByRole('button', { name: /sign in|log in/i });
  await signInBtn.click();

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
