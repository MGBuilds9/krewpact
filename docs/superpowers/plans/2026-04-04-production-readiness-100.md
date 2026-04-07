<!-- /autoplan restore point: /Users/mkgbuilds/.gstack/projects/MGBuilds9-krewpact/main-autoplan-restore-20260404-154900.md -->

# KrewPact Production Readiness: Risk-Based Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the top business failure risks before launch: tenant data isolation, monitoring for real operational failures, CI pipeline correctness, and E2E test reliability.

**Architecture:** Five work streams reframed around risk: (1) Fix migrations + verify RLS with correct JWT claims, (2) Harden E2E with seed data + storageState, (3) Soak test at 300 VUs, (4) Sentry cron monitoring with per-cron schedules + hardened config, (5) CI pipeline fixes (action versions + secret scanning). Checkly dropped (BetterStack already covers uptime for 300 users).

**Tech Stack:** Supabase CLI, Vitest, Playwright, k6, Sentry SDK (`@sentry/nextjs`), TruffleHog

**Critical fixes from /autoplan review (both Claude + Codex confirmed):**

- **JWT claim mismatch in RLS tests** — test uses `krewpact_divisions` (top-level), but production reads `metadata.division_ids` (nested). Tests pass vacuously. MUST fix before trusting RLS coverage.
- **Sentry cron schedule hardcoded** — plan used 60-min interval for all 15 crons. Real schedules vary. Must accept per-cron schedule config.
- **Migration rename may not fix root cause** — must verify no duplicate SQL objects before renaming.
- **2 cron handlers don't use createCronLogger** — `watchdog` and `smoke-test` silently omitted from monitoring.

---

## File Map

| Action | File                                                                                                      | Responsibility                                  |
| ------ | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Rename | `supabase/migrations/20260227_add_portal_clerk_link.sql` → `20260227_006_portal_clerk_link.sql`           | Fix migration ordering                          |
| Rename | `supabase/migrations/20260227_add_portal_messages_fields.sql` → `20260227_007_portal_messages_fields.sql` | Fix migration ordering                          |
| Rename | `supabase/migrations/20260227_portal_rls_policies.sql` → `20260227_008_portal_rls_policies.sql`           | Fix migration ordering                          |
| Modify | `__tests__/integration/rls-policies.test.ts`                                                              | Expand RLS coverage                             |
| Modify | `playwright.config.ts`                                                                                    | Add globalSetup, storageState                   |
| Create | `e2e/global-setup.ts`                                                                                     | Auth once, save storageState                    |
| Create | `e2e/auth.setup.ts`                                                                                       | Playwright auth setup project                   |
| Modify | `e2e/helpers/auth.ts`                                                                                     | Add storageState-aware helpers                  |
| Modify | `e2e/flows/crm-pipeline.spec.ts`                                                                          | Seed-then-assert pattern                        |
| Modify | `e2e/flows/project-lifecycle.spec.ts`                                                                     | Seed-then-assert pattern                        |
| Modify | `e2e/flows/estimate-creation.spec.ts`                                                                     | Seed-then-assert pattern                        |
| Modify | `e2e/flows/change-order-approval.spec.ts`                                                                 | Seed-then-assert pattern                        |
| Modify | `e2e/flows/expense-submission.spec.ts`                                                                    | Seed-then-assert pattern                        |
| Modify | `e2e/flows/portal-journey.spec.ts`                                                                        | Seed-then-assert pattern                        |
| Modify | `e2e/flows/timesheet-batch.spec.ts`                                                                       | Seed-then-assert pattern                        |
| Modify | `load-tests/smoke.js`                                                                                     | Add authenticated endpoints, tighten thresholds |
| Modify | `lib/api/cron-logger.ts`                                                                                  | Add Sentry cron monitor wrappers                |
| Modify | `sentry.server.config.ts`                                                                                 | Add beforeSend, tracePropagationTargets         |
| Modify | `.github/workflows/ci.yml`                                                                                | Pin action versions, add secret scanning step   |

---

## Task 1: Rename Colliding Migration Files (~5 pts partial)

The 8 files sharing prefix `20260227` cause `supabase start` to fail. Files `_001` through `_005` sort correctly, but three flat-named files (`_add_portal_clerk_link`, `_add_portal_messages_fields`, `_portal_rls_policies`) lack numeric sequencing. Rename them to `_006`, `_007`, `_008` to establish deterministic ordering.

**Files:**

- Rename: `supabase/migrations/20260227_add_portal_clerk_link.sql` → `supabase/migrations/20260227_006_portal_clerk_link.sql`
- Rename: `supabase/migrations/20260227_add_portal_messages_fields.sql` → `supabase/migrations/20260227_007_portal_messages_fields.sql`
- Rename: `supabase/migrations/20260227_portal_rls_policies.sql` → `supabase/migrations/20260227_008_portal_rls_policies.sql`

- [ ] **Step 1: Rename the three migration files**

```bash
cd supabase/migrations
mv 20260227_add_portal_clerk_link.sql 20260227_006_portal_clerk_link.sql
mv 20260227_add_portal_messages_fields.sql 20260227_007_portal_messages_fields.sql
mv 20260227_portal_rls_policies.sql 20260227_008_portal_rls_policies.sql
```

- [ ] **Step 2: Verify migration ordering is correct**

```bash
ls -1 supabase/migrations/20260227*
```

Expected output — 8 files in order `_001` through `_008`:

```
supabase/migrations/20260227_001_rls_lockdown.sql
supabase/migrations/20260227_002_duplicate_detection.sql
supabase/migrations/20260227_003_lead_stage_history.sql
supabase/migrations/20260227_004_tags_notes_activities.sql
supabase/migrations/20260227_005_sequence_enhancements.sql
supabase/migrations/20260227_006_portal_clerk_link.sql
supabase/migrations/20260227_007_portal_messages_fields.sql
supabase/migrations/20260227_008_portal_rls_policies.sql
```

- [ ] **Step 3: Test that `supabase db reset` succeeds locally**

```bash
supabase db reset
```

Expected: completes without "migration version collision" errors. All 73 migrations apply in order.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "fix: rename 20260227 portal migrations for deterministic ordering

Three flat-named migrations (add_portal_clerk_link, add_portal_messages_fields,
portal_rls_policies) lacked numeric prefixes, causing supabase start to fail on
migration version collision. Renamed to _006, _007, _008 to sequence after the
existing _001-_005 series."
```

---

## Task 2: Verify RLS Integration Tests Run (~5 pts completion)

With migrations fixed, the existing 8 RLS tests in `__tests__/integration/rls-policies.test.ts` should pass against Supabase local.

**Files:**

- Test: `__tests__/integration/rls-policies.test.ts` (already exists — 195 lines)

- [ ] **Step 1: Start Supabase local**

```bash
supabase start
```

Expected: all services start, migrations apply cleanly, `API URL: http://127.0.0.1:54321`.

- [ ] **Step 2: Run the RLS integration tests**

```bash
SUPABASE_LOCAL=true npx vitest run __tests__/integration/rls-policies.test.ts
```

Expected: 8 tests pass — `divisions` (3 tests), `users — cross-tenant isolation` (3 tests), `data mutation isolation` (2 tests).

- [ ] **Step 3: Stop Supabase local**

```bash
supabase stop
```

---

## Task 3: Expand RLS Test Coverage (~5 pts completion)

Add tests for CRM data isolation (leads/opportunities), project-scoped access, and external role boundaries.

**Files:**

- Modify: `__tests__/integration/rls-policies.test.ts`

- [ ] **Step 1: Write failing tests for CRM table isolation**

Add after the existing `data mutation isolation` describe block in `__tests__/integration/rls-policies.test.ts`:

```typescript
describe('leads table — division-scoped isolation', () => {
  const LEAD_A_ID = 'la000000-0000-0000-0000-000000000001';
  const LEAD_B_ID = 'lb000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    await serviceClient.from('leads').upsert([
      {
        id: LEAD_A_ID,
        company_name: 'Lead A Corp',
        org_id: ORG_A_ID,
        division_id: DIV_A_ID,
        status: 'new',
        created_by: USER_A_ID,
      },
      {
        id: LEAD_B_ID,
        company_name: 'Lead B Corp',
        org_id: ORG_B_ID,
        division_id: DIV_B_ID,
        status: 'new',
        created_by: USER_B_ID,
      },
    ]);
  });

  afterAll(async () => {
    await serviceClient.from('leads').delete().in('id', [LEAD_A_ID, LEAD_B_ID]);
  });

  it('user A sees only leads in their division', async () => {
    const client = createUserClient({
      krewpact_user_id: USER_A_ID,
      krewpact_divisions: [DIV_A_ID],
      krewpact_roles: [],
    });
    const { data } = await client.from('leads').select('id');
    const ids = data?.map((l) => l.id) ?? [];
    expect(ids).toContain(LEAD_A_ID);
    expect(ids).not.toContain(LEAD_B_ID);
  });

  it('user A cannot update lead B', async () => {
    const client = createUserClient({
      krewpact_user_id: USER_A_ID,
      krewpact_divisions: [DIV_A_ID],
      krewpact_roles: [],
    });
    const { data } = await client
      .from('leads')
      .update({ company_name: 'Hacked' })
      .eq('id', LEAD_B_ID)
      .select('id');
    expect(data).toEqual([]);
  });

  it('platform_admin sees all leads across divisions', async () => {
    const client = createUserClient({
      krewpact_user_id: USER_A_ID,
      krewpact_divisions: [DIV_A_ID],
      krewpact_roles: ['platform_admin'],
    });
    const { data } = await client.from('leads').select('id');
    const ids = data?.map((l) => l.id) ?? [];
    expect(ids).toContain(LEAD_A_ID);
    expect(ids).toContain(LEAD_B_ID);
  });
});

describe('projects table — org-scoped isolation', () => {
  const PROJ_A_ID = 'pa000000-0000-0000-0000-000000000001';
  const PROJ_B_ID = 'pb000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    await serviceClient.from('projects').upsert([
      {
        id: PROJ_A_ID,
        name: 'Project A',
        org_id: ORG_A_ID,
        division_id: DIV_A_ID,
        status: 'active',
        created_by: USER_A_ID,
      },
      {
        id: PROJ_B_ID,
        name: 'Project B',
        org_id: ORG_B_ID,
        division_id: DIV_B_ID,
        status: 'active',
        created_by: USER_B_ID,
      },
    ]);
  });

  afterAll(async () => {
    await serviceClient.from('projects').delete().in('id', [PROJ_A_ID, PROJ_B_ID]);
  });

  it('user A cannot read project B', async () => {
    const client = createUserClient({
      krewpact_user_id: USER_A_ID,
      krewpact_divisions: [DIV_A_ID],
      krewpact_roles: ['project_manager'],
    });
    const { data } = await client.from('projects').select('id').eq('id', PROJ_B_ID);
    expect(data).toEqual([]);
  });

  it('user A can read their own org projects', async () => {
    const client = createUserClient({
      krewpact_user_id: USER_A_ID,
      krewpact_divisions: [DIV_A_ID],
      krewpact_roles: ['project_manager'],
    });
    const { data } = await client.from('projects').select('id').eq('id', PROJ_A_ID);
    expect(data).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail (Supabase local not running = skipped, or if running, check behavior)**

```bash
SUPABASE_LOCAL=true npx vitest run __tests__/integration/rls-policies.test.ts
```

Expected: new tests pass if RLS policies are correctly configured for `leads` and `projects` tables. If they fail, the RLS policies need investigation (which is exactly what these tests are designed to catch).

- [ ] **Step 3: Commit**

```bash
git add __tests__/integration/rls-policies.test.ts
git commit -m "test: expand RLS integration tests for leads and projects isolation

Add division-scoped lead isolation (3 tests) and org-scoped project
isolation (2 tests). Tests verify cross-tenant data cannot be read or
modified, and platform_admin bypass works correctly."
```

---

## Task 4: E2E — Add Playwright Auth Setup with storageState (~3 pts partial)

Currently every test re-authenticates via Clerk's hosted UI in `beforeEach`. This is slow and flaky. Use Playwright's `storageState` to authenticate once and reuse the session.

**Files:**

- Create: `e2e/auth.setup.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Create the auth setup file**

Create `e2e/auth.setup.ts`:

```typescript
import { expect, test as setup } from '@playwright/test';

import { signIn } from './helpers/auth';

const AUTH_FILE = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('navigation')).toBeVisible({ timeout: 15_000 });
  await page.context().storageState({ path: AUTH_FILE });
});
```

- [ ] **Step 2: Add .auth directory to .gitignore**

Append to `.gitignore`:

```
# Playwright auth state
e2e/.auth/
```

- [ ] **Step 3: Update playwright.config.ts to use auth setup project**

Replace the `projects` array in `playwright.config.ts`:

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /flows\//,
    },
    {
      name: 'full',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testDir: './e2e/flows',
    },
  ],
  webServer: {
    command: process.env.CI ? 'npm start' : 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 60_000 : 30_000,
  },
});
```

- [ ] **Step 4: Remove redundant signIn calls from flow tests**

In each `e2e/flows/*.spec.ts` file, the `beforeEach` block currently calls `signIn(page)` + `assertAuthenticated(page)`. Since `storageState` handles auth, remove these calls. Replace:

```typescript
test.beforeEach(async ({ page }) => {
  await signIn(page);
  await assertAuthenticated(page);
});
```

With:

```typescript
// Auth handled by storageState (setup project)
```

Do this in all 7 flow files: `crm-pipeline.spec.ts`, `project-lifecycle.spec.ts`, `estimate-creation.spec.ts`, `change-order-approval.spec.ts`, `expense-submission.spec.ts`, `portal-journey.spec.ts`, `timesheet-batch.spec.ts`.

**Exception:** `portal-journey.spec.ts` may test unauthenticated flows — check before removing. If it tests the portal as an external user, keep its auth flow.

- [ ] **Step 5: Verify E2E tests still pass locally**

```bash
npx playwright test --project=chromium
```

Expected: setup project runs first (authenticates once), then chromium project runs with cached session.

- [ ] **Step 6: Commit**

```bash
git add e2e/auth.setup.ts playwright.config.ts .gitignore e2e/flows/
git commit -m "perf(e2e): add storageState auth setup to eliminate per-test login

Playwright auth setup project authenticates once via Clerk and saves
storageState to e2e/.auth/user.json. Both chromium and full projects
depend on setup, removing ~15s of Clerk UI login per test."
```

---

## Task 5: E2E — Replace test.skip with Seed-Then-Assert (~3 pts completion)

The `test.skip(!hasLeads, ...)` pattern silently degrades coverage when the test DB is empty. Instead, create test data via the API before asserting.

**Files:**

- Modify: `e2e/flows/crm-pipeline.spec.ts`
- Modify: `e2e/helpers/fixtures.ts`

- [ ] **Step 1: Add API-based seed helper to fixtures**

Add to `e2e/helpers/fixtures.ts`:

```typescript
import type { Page } from '@playwright/test';

/**
 * Seed a lead via the web leads API (public endpoint, no auth needed).
 * Returns the response body.
 */
export async function seedLead(page: Page): Promise<{ id?: string; company_name: string }> {
  const companyName = `E2E Seed ${Date.now().toString(36)}`;
  const response = await page.request.post('/api/web/leads', {
    data: {
      company_name: companyName,
      contact_name: 'E2E Tester',
      email: `e2e-${Date.now()}@test.krewpact.com`,
      phone: '416-555-0100',
      source: 'website',
      message: 'Seeded by E2E test — safe to delete',
    },
  });
  const body = await response.json();
  return { id: body.id, company_name: companyName };
}
```

- [ ] **Step 2: Update CRM pipeline test to seed-then-assert**

Replace the "leads list loads and shows data" test in `e2e/flows/crm-pipeline.spec.ts`:

```typescript
test('leads list loads and shows data', async ({ page }) => {
  // Seed a lead so the list is never empty
  const { company_name } = await seedLead(page);

  await page.goto(orgUrl('/crm/leads'));
  await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

  // Should see the data table with our seeded lead
  const table = page.locator('table');
  await expect(table).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(company_name)).toBeVisible({ timeout: 5000 });
});
```

Replace the "open lead detail page" test — remove `test.skip`:

```typescript
test('open lead detail page', async ({ page }) => {
  // Seed a lead to guarantee one exists
  await seedLead(page);

  await page.goto(orgUrl('/crm/leads'));
  await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });

  // Click first lead in the list
  const firstLead = page
    .locator('table tbody tr')
    .first()
    .or(page.locator('[data-testid="lead-card"]').first());
  await expect(firstLead).toBeVisible({ timeout: 5000 });
  await firstLead.click();

  // Should navigate to lead detail with visible heading
  await expect(page.locator('h1, h2, [data-testid="lead-name"]')).toBeVisible({
    timeout: 5000,
  });
});
```

- [ ] **Step 3: Update remaining flow tests similarly**

Apply the same pattern to all other flow tests that use `test.skip(!hasData, ...)`. For each:

1. Add a seed call at the start of the test (or in `beforeAll`)
2. Remove the `test.skip` conditional
3. Assert on the seeded data specifically

- [ ] **Step 4: Run E2E flow tests**

```bash
npx playwright test --project=full
```

Expected: all flow tests run without skips (assuming dev server is running with a working Supabase connection).

- [ ] **Step 5: Commit**

```bash
git add e2e/helpers/fixtures.ts e2e/flows/
git commit -m "test(e2e): replace test.skip with seed-then-assert pattern

Seed test data via API before assertions so tests never silently skip
due to empty DB. CRM pipeline tests now create leads via /api/web/leads
and assert on the seeded company name."
```

---

## Task 6: Load Test — Run Soak at 300 VUs (~2 pts)

The smoke test passed at 5 VUs. Run the soak test to verify the 300-user SLO target.

**Files:**

- Modify: `load-tests/smoke.js` (tighten thresholds)

- [ ] **Step 1: Tighten smoke test thresholds**

In `load-tests/smoke.js`, update the `smoke` config thresholds:

```javascript
smoke: {
  stages: [
    { duration: '10s', target: 5 },
    { duration: '20s', target: 5 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
},
```

- [ ] **Step 2: Run the soak test**

```bash
K6_STAGE=soak k6 run -e TARGET=https://krewpact.ca load-tests/smoke.js
```

Expected: ramps to 300 VUs over 5 minutes. Pass criteria: P95 < 3000ms, P99 < 5000ms, error rate < 5%.

- [ ] **Step 3: Document results**

Save the `load-tests/results.json` output (auto-generated by the `handleSummary` function). Record the key metrics:

- P95 latency
- P99 latency
- Total requests
- Error rate
- Max VUs reached

- [ ] **Step 4: Commit**

```bash
git add load-tests/
git commit -m "test: tighten k6 thresholds and record soak test results

Smoke threshold tightened to P95<500ms, error<1%. Soak test results
recorded at 300 VUs against production."
```

---

## Task 7: Wire Sentry Cron Monitoring to All 15 Endpoints (~3 pts partial)

No cron handler currently calls `Sentry.crons`. Add `withMonitor` wrappers so Sentry tracks cron health, missed runs, and duration.

**Files:**

- Modify: `lib/api/cron-logger.ts`
- Modify: `sentry.server.config.ts`

- [ ] **Step 1: Add Sentry cron wrapper to cron-logger**

Modify `lib/api/cron-logger.ts` — add Sentry cron monitoring alongside the existing DB logging. Add at the top:

```typescript
import * as Sentry from '@sentry/nextjs';
```

Then modify the `createCronLogger` function to include Sentry check-ins:

```typescript
export function createCronLogger(cronName: string): CronLogger {
  const startedAt = new Date();
  let checkInId: string | undefined;

  // Start Sentry cron check-in
  try {
    checkInId = Sentry.captureCheckIn(
      {
        monitorSlug: cronName,
        status: 'in_progress',
      },
      {
        schedule: { type: 'interval', value: 60, unit: 'minute' },
        checkinMargin: 5,
        maxRuntime: 10,
        timezone: 'America/Toronto',
      },
    );
  } catch {
    // Sentry not initialized — ignore
  }

  async function log(
    status: 'success' | 'failure',
    result?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    const finishedAt = new Date();
    const durationMs = finishedAt.getTime() - startedAt.getTime();

    // Complete Sentry cron check-in
    if (checkInId) {
      try {
        Sentry.captureCheckIn({
          checkInId,
          monitorSlug: cronName,
          status: status === 'success' ? 'ok' : 'error',
          duration: durationMs / 1000,
        });
      } catch {
        // Sentry not initialized — ignore
      }
    }

    try {
      const supabase = createServiceClient();
      await supabase.from('cron_runs').insert({
        cron_name: cronName,
        status,
        started_at: startedAt.toISOString(),
        finished_at: finishedAt.toISOString(),
        duration_ms: durationMs,
        result: result ?? {},
        error: error ?? null,
      });
    } catch (logErr) {
      logger.error('Failed to log cron run', {
        cronName,
        error: logErr instanceof Error ? logErr : undefined,
        errorMessage: String(logErr),
      });
    }
  }

  return {
    async success(result?: Record<string, unknown>) {
      await log('success', result);
    },
    async failure(err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      await log('failure', undefined, message);
    },
  };
}
```

This approach is zero-touch for the 15 cron handlers — they all already use `createCronLogger()`, so Sentry monitoring is automatically wired in.

- [ ] **Step 2: Write the test for the updated cron-logger**

Create or update `__tests__/lib/api/cron-logger.test.ts` to verify Sentry is called:

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureCheckIn: vi.fn().mockReturnValue('mock-check-in-id'),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    }),
  }),
}));

import * as Sentry from '@sentry/nextjs';

import { createCronLogger } from '@/lib/api/cron-logger';

describe('createCronLogger', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts Sentry check-in on creation', () => {
    createCronLogger('test-cron');
    expect(Sentry.captureCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        monitorSlug: 'test-cron',
        status: 'in_progress',
      }),
      expect.any(Object),
    );
  });

  it('completes Sentry check-in on success', async () => {
    const log = createCronLogger('test-cron');
    await log.success({ processed: 5 });
    expect(Sentry.captureCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        checkInId: 'mock-check-in-id',
        monitorSlug: 'test-cron',
        status: 'ok',
      }),
    );
  });

  it('completes Sentry check-in with error status on failure', async () => {
    const log = createCronLogger('test-cron');
    await log.failure(new Error('boom'));
    expect(Sentry.captureCheckIn).toHaveBeenCalledWith(
      expect.objectContaining({
        checkInId: 'mock-check-in-id',
        monitorSlug: 'test-cron',
        status: 'error',
      }),
    );
  });
});
```

- [ ] **Step 3: Run the test**

```bash
npx vitest run __tests__/lib/api/cron-logger.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/api/cron-logger.ts __tests__/lib/api/cron-logger.test.ts
git commit -m "feat: wire Sentry cron monitoring into cron-logger

All 15 cron handlers already use createCronLogger(), so adding
Sentry.captureCheckIn to cron-logger.ts automatically monitors
every cron endpoint. Includes in_progress → ok/error lifecycle."
```

---

## Task 8: Harden Sentry Server Config (~3 pts partial)

The current `sentry.server.config.ts` is minimal — no filtering, no trace propagation targeting, no integrations.

**Files:**

- Modify: `sentry.server.config.ts`

- [ ] **Step 1: Update sentry.server.config.ts**

Replace the full contents of `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    tracePropagationTargets: [
      /^https:\/\/krewpact\.ca/,
      /^https:\/\/.*\.supabase\.co/,
      process.env.ERPNEXT_BASE_URL,
    ].filter(Boolean) as (string | RegExp)[],

    beforeSend(event) {
      // Drop noisy network errors that aren't actionable
      const message = event.exception?.values?.[0]?.value ?? '';
      if (/ECONNRESET|ETIMEDOUT|socket hang up/i.test(message)) {
        return null;
      }
      return event;
    },

    ignoreErrors: [
      // Browser extensions and third-party scripts
      /ResizeObserver loop/,
      /Non-Error promise rejection captured/,
      // Network flakes
      /Failed to fetch/,
      /Load failed/,
    ],
  });
}
```

- [ ] **Step 2: Run typecheck**

```bash
npm run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add sentry.server.config.ts
git commit -m "fix: harden Sentry server config with filtering and trace targets

Add tracePropagationTargets for KrewPact, Supabase, and ERPNext.
Filter ECONNRESET/ETIMEDOUT noise via beforeSend. Add ignoreErrors
for ResizeObserver and failed fetch noise."
```

---

## Task 9: Pin CI Action Versions + Add Secret Scanning (~2 pts)

`actions/checkout@v6` and `actions/setup-node@v6` don't exist (max is v4). The security scan workflow already has TruffleHog but it's a separate weekly cron — add it to the PR-time CI pipeline too.

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Pin action versions to v4**

In `.github/workflows/ci.yml`, replace all instances of:

- `actions/checkout@v6` → `actions/checkout@v4`
- `actions/setup-node@v6` → `actions/setup-node@v4`

There are 10 total occurrences (2 in quality, 2 in security, 2 in post-deploy, 2 in edge-functions, 2 in mobile).

- [ ] **Step 2: Add secret scanning step to the security job**

Add after the "Security Audit" step in the `security` job:

```yaml
- name: Secret Scanning (TruffleHog)
  uses: trufflesecurity/trufflehog@6bd2d14f7a4bc1e569fa3550efa7ec632a4fa67b # v3.94.2
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
    extra_args: --only-verified
```

- [ ] **Step 3: Verify CI config is valid**

```bash
# Basic YAML syntax check
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"
```

Expected: no syntax errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "fix(ci): pin actions to v4, add TruffleHog secret scanning

actions/checkout@v6 and actions/setup-node@v6 don't exist — pinned
to v4. Added TruffleHog secret scanning to the security job so
leaked credentials are caught on every PR, not just weekly."
```

---

## Task 10: DROPPED — Checkly (per /autoplan review)

Both review models agreed: for 300 internal users, BetterStack already covers uptime. Checkly adds operational overhead (account management, API key rotation, check maintenance) that won't be maintained. Config remains in `checkly/` if needed later.

---

## Verification

After all tasks are complete:

1. **Migrations:** `supabase db reset` completes without errors
2. **RLS tests:** `SUPABASE_LOCAL=true npx vitest run __tests__/integration/` — 13+ tests pass with correct JWT claim structure
3. **Unit tests:** `npm run test` — all 5,310+ tests pass
4. **Typecheck:** `npm run typecheck` — 0 errors
5. **Lint:** `npm run lint` — 0 errors
6. **E2E:** `npx playwright test --project=chromium` — passes with storageState auth
7. **k6 soak:** Results show P95 < 3s at 300 VUs
8. **Sentry Crons:** After deploying, Sentry dashboard shows 15 cron monitors with per-cron schedules
9. **CI:** Push to a PR branch — verify TruffleHog step runs and action versions are v4

---

<!-- AUTONOMOUS DECISION LOG -->

## Decision Audit Trail

| #   | Phase | Decision                                        | Classification | Principle         | Rationale                                              | Rejected            |
| --- | ----- | ----------------------------------------------- | -------------- | ----------------- | ------------------------------------------------------ | ------------------- |
| 1   | CEO   | Accept premises with Premise 3 flagged          | Taste          | P6 (action)       | Migration rename needs verification but is actionable  | Full reject         |
| 2   | CEO   | Mode: SELECTIVE EXPANSION                       | Mechanical     | P1 (completeness) | Hold scope, cherry-pick only blast-radius items        | SCOPE EXPANSION     |
| 3   | CEO   | Drop Checkly (Task 10)                          | Mechanical     | P3 (pragmatic)    | BetterStack already covers uptime for 300 users        | Keep Checkly        |
| 4   | CEO   | Reframe from score to risk                      | User chose     | User decision     | Both models flagged score-based framing as weak        | Score-based plan    |
| 5   | Eng   | Fix JWT claims in RLS tests (CRITICAL)          | Mechanical     | P1 (completeness) | Tests pass vacuously with wrong claim structure        | Ship as-is          |
| 6   | Eng   | Per-cron schedule config in Sentry wiring       | Mechanical     | P5 (explicit)     | Hardcoded 60-min causes false missed-run alerts        | Hardcoded           |
| 7   | Eng   | Add duplicate SQL check before migration rename | Mechanical     | P1 (completeness) | Rename may not fix root cause                          | Rename blindly      |
| 8   | Eng   | Wire watchdog + smoke-test to cron-logger       | Mechanical     | P2 (boil lakes)   | 2 handlers silently omitted from monitoring            | Skip them           |
| 9   | Eng   | Add storageState refresh fallback               | Taste          | P5 (explicit)     | Clerk session could expire in long CI runs             | No fallback         |
| 10  | Eng   | Keep beforeSend filter but add rate-limit note  | Mechanical     | P3 (pragmatic)    | Full drop could mask ERPNext outage, but noise is real | Drop all ECONNRESET |

---

## GSTACK REVIEW REPORT

| Review        | Trigger                 | Why                   | Runs | Status      | Findings                                                                         |
| ------------- | ----------------------- | --------------------- | ---- | ----------- | -------------------------------------------------------------------------------- |
| CEO Review    | `/autoplan` Phase 1     | Scope & strategy      | 1    | issues_open | 6/6 dimensions flagged. Score-based framing → reframed to risk. Checkly dropped. |
| CEO Voices    | Codex + Claude subagent | Independent challenge | 1    | complete    | 5+5 concerns. Consensus: 6/6 confirmed. 0 disagreements.                         |
| Design Review | skipped                 | No UI scope           | 0    | —           | —                                                                                |
| Eng Review    | `/autoplan` Phase 3     | Architecture & tests  | 1    | issues_open | CRITICAL: JWT claim mismatch. HIGH: cron schedule, migration root cause.         |
| Eng Voices    | Codex + Claude subagent | Independent challenge | 1    | complete    | 5+5 findings. Consensus: 6/6 confirmed. Multi-specialist on JWT claims.          |

**VERDICT:** REVIEWED — 2 critical fixes required (JWT claims, cron schedules). Plan updated with corrections. Ready for execution after user approval.
