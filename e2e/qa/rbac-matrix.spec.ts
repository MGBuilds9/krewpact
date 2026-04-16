/**
 * Automated RBAC walkthrough — 9 roles x 21 sections.
 *
 * For each canonical internal role, navigates to one representative route
 * per section and verifies whether the page is accessible or denied.
 *
 * Enforcement pattern: RoleGuard renders an "Access Denied" div (HTTP 200).
 * FeatureGate renders a "Feature not available" EmptyState (also HTTP 200).
 * Neither produces an HTTP 403 or redirect — the assertion is text-based.
 *
 * IMPORTANT: Not all sections enforce RBAC at the UI level. Some rely on
 * RLS at the Supabase layer (page loads but data is scoped/empty). When a
 * "should be denied" test passes because no guard exists, that is a REAL
 * FINDING — the guard is missing and should be filed as an rbac-audit ticket.
 *
 * Run: `npm run qa:rbac`
 *
 * Depends on: `rbac-auth.setup.ts` (creates storage states for all 9 roles).
 */

import { expect, test } from '@playwright/test';

const ROLES = [
  'platform_admin',
  'executive',
  'operations_manager',
  'project_manager',
  'project_coordinator',
  'estimator',
  'field_supervisor',
  'accounting',
  'payroll_admin',
] as const;

type Role = (typeof ROLES)[number];

// One representative route per section. These are the top-level landing pages.
const SECTION_ROUTES = [
  { section: 'dashboard', path: '/dashboard' },
  { section: 'admin', path: '/admin' },
  { section: 'crm', path: '/crm' },
  { section: 'estimates', path: '/estimates' },
  { section: 'projects', path: '/projects' },
  { section: 'inventory', path: '/inventory' },
  { section: 'executive', path: '/executive' },
  { section: 'finance', path: '/finance' },
  { section: 'expenses', path: '/expenses' },
  { section: 'payroll', path: '/payroll' },
  { section: 'timesheets', path: '/timesheets' },
  { section: 'tasks', path: '/tasks' },
  { section: 'schedule', path: '/schedule' },
  { section: 'team', path: '/team' },
  { section: 'portals', path: '/portals' },
  { section: 'contracts', path: '/contracts' },
  { section: 'documents', path: '/documents' },
  { section: 'reports', path: '/reports' },
  { section: 'settings', path: '/settings' },
] as const;

type Section = (typeof SECTION_ROUTES)[number]['section'];

// Expected outcomes from scripts/generate-role-matrix.ts.
// Codes: admin | edit | view | limited | 403
const MATRIX: Record<Section, Record<Role, string>> = {
  dashboard: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'view',
    project_coordinator: 'limited',
    estimator: 'view',
    field_supervisor: 'limited',
    accounting: 'view',
    payroll_admin: 'view',
  },
  admin: {
    platform_admin: 'admin',
    executive: '403',
    operations_manager: '403',
    project_manager: '403',
    project_coordinator: '403',
    estimator: '403',
    field_supervisor: '403',
    accounting: '403',
    payroll_admin: '403',
  },
  crm: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'limited',
    estimator: 'edit',
    field_supervisor: '403',
    accounting: 'view',
    payroll_admin: '403',
  },
  estimates: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'view',
    estimator: 'edit',
    field_supervisor: '403',
    accounting: 'view',
    payroll_admin: '403',
  },
  projects: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'edit',
    estimator: 'view',
    field_supervisor: 'limited',
    accounting: 'view',
    payroll_admin: '403',
  },
  inventory: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'view',
    project_coordinator: 'view',
    estimator: '403',
    field_supervisor: 'limited',
    accounting: 'view',
    payroll_admin: '403',
  },
  executive: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: '403',
    project_manager: '403',
    project_coordinator: '403',
    estimator: '403',
    field_supervisor: '403',
    accounting: '403',
    payroll_admin: '403',
  },
  finance: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'limited',
    project_coordinator: '403',
    estimator: '403',
    field_supervisor: '403',
    accounting: 'edit',
    payroll_admin: '403',
  },
  expenses: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'limited',
    estimator: 'limited',
    field_supervisor: 'limited',
    accounting: 'edit',
    payroll_admin: '403',
  },
  payroll: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: '403',
    project_manager: '403',
    project_coordinator: '403',
    estimator: '403',
    field_supervisor: '403',
    accounting: 'view',
    payroll_admin: 'edit',
  },
  timesheets: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'edit',
    project_coordinator: 'limited',
    estimator: 'limited',
    field_supervisor: 'edit',
    accounting: 'view',
    payroll_admin: 'edit',
  },
  tasks: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'edit',
    estimator: 'view',
    field_supervisor: 'limited',
    accounting: '403',
    payroll_admin: '403',
  },
  schedule: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: 'view',
    accounting: '403',
    payroll_admin: '403',
  },
  team: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'view',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: 'view',
    accounting: 'view',
    payroll_admin: 'edit',
  },
  portals: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'view',
    estimator: '403',
    field_supervisor: '403',
    accounting: '403',
    payroll_admin: '403',
  },
  contracts: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: '403',
    accounting: 'view',
    payroll_admin: '403',
  },
  documents: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'edit',
    project_manager: 'edit',
    project_coordinator: 'edit',
    estimator: 'view',
    field_supervisor: 'view',
    accounting: 'view',
    payroll_admin: 'view',
  },
  reports: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'view',
    project_manager: 'view',
    project_coordinator: 'view',
    estimator: 'view',
    field_supervisor: '403',
    accounting: 'view',
    payroll_admin: 'view',
  },
  settings: {
    platform_admin: 'admin',
    executive: 'view',
    operations_manager: 'limited',
    project_manager: 'limited',
    project_coordinator: 'limited',
    estimator: 'limited',
    field_supervisor: 'limited',
    accounting: 'limited',
    payroll_admin: 'limited',
  },
};

const DENIED_PATTERN = /Access Denied|Feature not available/i;

for (const role of ROLES) {
  test.describe(role, () => {
    test.use({ storageState: `e2e/qa/.auth/rbac-${role}.json` });

    for (const { section, path } of SECTION_ROUTES) {
      const expected = MATRIX[section][role];
      const shouldBeDenied = expected === '403';

      test(`${section} (${path}) -> ${expected}`, async ({ page }) => {
        const response = await page.goto(`/org/mdm-group${path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 20_000,
        });

        // If the server returned a hard error, fail immediately.
        const status = response?.status() ?? 0;
        expect(status, `Server returned ${status} for ${path}`).toBeLessThan(500);

        // Wait for client hydration (RoleGuard/FeatureGate render client-side).
        // `networkidle` is unreliable against prod (perpetual React Query /
        // Sentry polling), so use a fixed post-DOM delay instead.
        await page.waitForTimeout(2000);
        const bodyText = (await page.textContent('body')) ?? '';
        const isDenied = DENIED_PATTERN.test(bodyText);

        if (shouldBeDenied) {
          expect(
            isDenied,
            `MISSING GUARD: ${role} should be denied on /${section} but page loaded normally. ` +
              `File as rbac-audit ticket — RoleGuard missing for this section/role.`,
          ).toBe(true);
        } else {
          expect(
            isDenied,
            `UNEXPECTED DENIAL: ${role} should have '${expected}' access to /${section} ` +
              `but got Access Denied.`,
          ).toBe(false);
        }
      });
    }
  });
}
