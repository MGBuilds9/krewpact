/**
 * RBAC auth setup — signs in as all 9 canonical internal roles.
 *
 * Creates one Playwright storage state file per role at
 * `e2e/qa/.auth/rbac-{role}.json`. The `rbac-matrix` spec then uses
 * `test.use({ storageState })` per describe block to walk routes as
 * each role independently.
 *
 * Test users are created by `scripts/seed-qa-users.ts` at the
 * `@mdmgroupinc.ca` domain (qa-admin, qa-exec, qa-pm, etc.). All share
 * the same password (`QA_TEST_PASSWORD` env var). Each user must have
 * password authentication enabled in Clerk.
 *
 * Required env vars:
 *   CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
 *   CLERK_SECRET_KEY
 *   QA_TEST_PASSWORD
 */

import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';

const ROLE_USERS = [
  { role: 'platform_admin', email: 'qa-admin@mdmgroupinc.ca' },
  { role: 'executive', email: 'qa-exec@mdmgroupinc.ca' },
  { role: 'operations_manager', email: 'qa-opsmgr@mdmgroupinc.ca' },
  { role: 'project_manager', email: 'qa-pm@mdmgroupinc.ca' },
  { role: 'project_coordinator', email: 'qa-coord@mdmgroupinc.ca' },
  { role: 'estimator', email: 'qa-estimator@mdmgroupinc.ca' },
  { role: 'field_supervisor', email: 'qa-field@mdmgroupinc.ca' },
  { role: 'accounting', email: 'qa-accounting@mdmgroupinc.ca' },
  { role: 'payroll_admin', email: 'qa-payroll@mdmgroupinc.ca' },
] as const;

setup('authenticate all RBAC test users', async ({ browser }) => {
  // 9 sequential sign-ins against prod + network round-trips — allow 5 minutes.
  // Default 30s is not enough.
  setup.setTimeout(300_000);

  await clerkSetup();

  const password = process.env.QA_TEST_PASSWORD;
  if (!password) {
    throw new Error(
      'QA_TEST_PASSWORD env var required for RBAC tests. ' +
        'This is the shared password set when running `npx tsx scripts/seed-qa-users.ts`.',
    );
  }

  for (const { role, email } of ROLE_USERS) {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/auth');
    await clerk.signIn({
      page,
      signInParams: { strategy: 'password', identifier: email, password },
    });

    // Land on an authenticated page so Clerk writes all cookies. Use
    // `domcontentloaded` rather than `networkidle` because the app has
    // perpetual polling (React Query, Sentry) that never idles in prod.
    await page.goto('/org/mdm-group/dashboard', { waitUntil: 'domcontentloaded' });
    // Give Clerk a moment to finish writing cookies after the first
    // authenticated request. 1.5s is empirically enough.
    await page.waitForTimeout(1500);

    await context.storageState({ path: `e2e/qa/.auth/rbac-${role}.json` });
    await context.close();

    // Small delay between sign-ins to respect Clerk rate limits.
    await new Promise((r) => setTimeout(r, 1000));
  }
});
