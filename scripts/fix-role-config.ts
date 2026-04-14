/**
 * One-off: fix role assignments flagged during Phase 1 closeout walkthrough.
 *
 *   - David Guirguis  → primary platform_admin, keep project_manager as secondary
 *   - CI Test         → platform_admin (replaces project_coordinator)
 *   - Hani Abdelmalek → estimator (canonical mapping of "sales rep" in construction CRM)
 *   - Nagy Salib      → executive
 *
 * Dual-writes to Supabase user_roles + Clerk publicMetadata via the canonical
 * `syncRolesToBothStores` helper.
 *
 * Usage:
 *   tsx --env-file=.env.local scripts/fix-role-config.ts [--dry-run]
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *               CLERK_SECRET_KEY.
 */
import { createClient } from '@supabase/supabase-js';

import { syncRolesToBothStores } from '@/lib/rbac/sync-roles';

const DRY_RUN = process.argv.includes('--dry-run');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!process.env.CLERK_SECRET_KEY) {
  console.error('Missing CLERK_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

type Change = {
  email: string;
  roleKeys: string[];
  note: string;
};

const CHANGES: Change[] = [
  {
    email: 'david.guirguis@mdmcontracting.ca',
    roleKeys: ['platform_admin', 'project_manager'],
    note: 'Second platform_admin for redundancy; keep PM as secondary',
  },
  {
    email: 'ci-test@mdmgroupinc.ca',
    roleKeys: ['platform_admin'],
    note: 'CI needs widest coverage for auth smoke tests (RBAC covered by 4 QA users)',
  },
  {
    email: 'hani@mdmcontracting.ca',
    roleKeys: ['estimator'],
    note: 'Sales rep → canonical estimator role',
  },
  {
    email: 'nagy.salib@mdmgroupinc.ca',
    roleKeys: ['executive'],
    note: 'Office role → executive per user direction',
  },
];

async function main() {
  console.log(`=== fix-role-config ===`);
  console.log(`dry-run: ${DRY_RUN}\n`);

  for (const change of CHANGES) {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, clerk_user_id, first_name, last_name, email')
      .eq('email', change.email)
      .maybeSingle();

    if (error || !user) {
      console.log(`  SKIP ${change.email} — not found (${error?.message ?? 'no row'})`);
      continue;
    }
    if (!user.clerk_user_id) {
      console.log(`  SKIP ${change.email} — no clerk_user_id`);
      continue;
    }

    const { data: currentRoles } = await supabase
      .from('user_roles')
      .select('roles(role_key), is_primary')
      .eq('user_id', user.id);

    const currentSummary = (currentRoles ?? [])
      .map((r) => {
        const role = Array.isArray(r.roles) ? r.roles[0] : r.roles;
        return `${(role as { role_key?: string } | null)?.role_key}${r.is_primary ? '*' : ''}`;
      })
      .join(', ');

    console.log(`\n  ${user.first_name} ${user.last_name} <${user.email}>`);
    console.log(`    before: ${currentSummary || '(none)'}`);
    console.log(`    after:  ${change.roleKeys[0]}* ${change.roleKeys.slice(1).join(', ')}`);
    console.log(`    why:    ${change.note}`);

    if (DRY_RUN) continue;

    const result = await syncRolesToBothStores({
      supabaseUserId: user.id,
      clerkUserId: user.clerk_user_id,
      roleKeys: change.roleKeys,
    });

    if (!result.success) {
      console.log(`    FAILED: ${result.errors.join('; ')}`);
    } else {
      console.log(`    ok`);
    }
  }

  console.log(`\nDone.`);
}

main().catch((err) => {
  console.error('fix-role-config failed:', err);
  process.exit(1);
});
