/**
 * QA auth setup using @clerk/testing.
 *
 * Why this exists separate from `e2e/auth.setup.ts`:
 *   The dev auth setup fills in the Clerk-hosted sign-in form via Playwright
 *   page interactions. That works against a local dev instance because Clerk
 *   doesn't apply bot detection in development. Against production, however,
 *   Clerk's WAF actively blocks automated form-fill — the visible Chromium
 *   window literally closes mid-login because Clerk detects automation
 *   fingerprints (navigator.webdriver, plugins shape, behavioral patterns).
 *
 *   `@clerk/testing` exists for exactly this. `clerk.signIn()` calls Clerk's
 *   API directly (not via the UI), so there's no form-fill, no fingerprint
 *   surface, and no popup-close. Combined with `clerkSetup()`, which obtains
 *   a Testing Token from Clerk's Backend API, we bypass bot detection
 *   entirely. Clerk built this for E2E testing — it's the official path.
 *
 * This setup only runs once per `npm run qa:e2e` invocation. It signs in,
 * persists the storage state to `e2e/qa/.auth/qa-user.json`, and every
 * subsequent test in the run reuses that state via the Playwright project
 * `storageState` config. No re-auth, no race against the 60-second JWT TTL.
 */

import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';

const AUTH_FILE = 'e2e/qa/.auth/qa-user.json';

setup('authenticate via clerk testing tokens', async ({ page }) => {
  // Fetch a Testing Token from Clerk's Backend API. Required exactly once
  // per test run. Reads CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY from env.
  await clerkSetup();

  const email = process.env.QA_TEST_EMAIL;
  const password = process.env.QA_TEST_PASSWORD;
  if (!email || !password) {
    throw new Error(
      'QA_TEST_EMAIL and QA_TEST_PASSWORD must be set in .env.local for the QA E2E pipeline. ' +
        'See CLAUDE.md "Authenticated Production QA" section.',
    );
  }

  // `clerk.signIn` requires the page to be loaded somewhere that has Clerk
  // initialized — the auth page is the canonical entry point.
  await page.goto('/auth');

  // Sign in via Clerk's API. No UI form interaction at all.
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: email,
      password,
    },
  });

  // Land on a real authenticated page so the storage state captures every
  // cookie Clerk sets after the first authenticated request.
  await page.goto('/org/mdm-group/dashboard');
  // Allow client-side hydration to finish so any JS-set cookies are present.
  await page.waitForLoadState('networkidle');

  await page.context().storageState({ path: AUTH_FILE });
});
