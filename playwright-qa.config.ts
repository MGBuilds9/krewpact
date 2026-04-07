/**
 * Dedicated Playwright config for /qa runs against production (or any
 * remote environment). Separate from `playwright.config.ts` so the
 * existing dev E2E suite stays untouched.
 *
 * Key differences from the dev config:
 * - No `webServer` (we hit a remote URL, not a local dev server)
 * - `baseURL` defaults to https://krewpact.ca but is overridable via
 *   `QA_BASE_URL` env var so the same config works against staging or
 *   a Vercel preview deployment
 * - Auth setup uses `@clerk/testing` `clerk.signIn()` to bypass Clerk's
 *   bot detection. This is the official Clerk-blessed path for E2E
 *   testing — no UI form-fill, no fingerprint detection, no popup
 *   close on submit.
 * - Storage state lives in `e2e/qa/.auth/` (gitignored)
 *
 * Required env vars:
 * - `CLERK_PUBLISHABLE_KEY` — same as the live app
 * - `CLERK_SECRET_KEY` — needed by `clerkSetup()` to mint a Testing Token
 * - `QA_TEST_EMAIL` — the test user's email
 * - `QA_TEST_PASSWORD` — the test user's password
 *
 * Run: `npm run qa:e2e`
 */

import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load .env.local before reading any Clerk env vars. Playwright doesn't
// auto-load env files (Next.js does that for the dev server, but we're
// hitting a remote URL with no webServer here).
dotenv.config({ path: '.env.local' });

// `@clerk/testing` reads `CLERK_PUBLISHABLE_KEY` (no NEXT_PUBLIC_ prefix).
// Krewpact's app uses the Next.js convention `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
// Bridge them so we don't have to duplicate the value in .env.local.
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

const QA_BASE_URL = process.env.QA_BASE_URL ?? 'https://krewpact.ca';

export default defineConfig({
  testDir: './e2e/qa',
  // Run sequentially: each test rebuilds storage state from a fresh sign-in.
  // Parallel runs would race against Clerk's rate limits.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: '.gstack/qa-reports/playwright-html', open: 'never' }],
    ['json', { outputFile: '.gstack/qa-reports/playwright-results.json' }],
  ],
  use: {
    baseURL: QA_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Slightly longer than the dev config — production has a real network round trip.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'qa-setup',
      testMatch: /qa-auth\.setup\.ts/,
    },
    {
      name: 'qa-prod',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/qa/.auth/qa-user.json',
      },
      dependencies: ['qa-setup'],
      testIgnore: /qa-auth\.setup\.ts/,
    },
  ],
});
