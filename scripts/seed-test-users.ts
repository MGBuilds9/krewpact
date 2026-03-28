/**
 * Seed users in Supabase (org_users / users / user_roles / user_divisions).
 *
 * Two modes:
 *
 *   1. Production admin seed (recommended for first deploy):
 *      Set SEED_ADMIN_CLERK_ID in .env.local and run with --admin-only flag.
 *      Creates a single platform_admin row linked to an existing Clerk user.
 *      Clerk user must already exist (created manually in Clerk dashboard).
 *
 *      npx tsx scripts/seed-test-users.ts --admin-only
 *
 *   2. Full UAT seed (creates 13 Clerk test users + Supabase rows):
 *      npx tsx scripts/seed-test-users.ts
 *
 * Required env vars (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL  — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 *   CLERK_SECRET_KEY          — Clerk Backend API key (required for full UAT seed)
 *   SEED_ADMIN_CLERK_ID       — Existing Clerk user ID for admin-only mode
 *   SEED_ADMIN_EMAIL          — Admin email (optional, defaults to admin@example.com)
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const ADMIN_ONLY = process.argv.includes('--admin-only');

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEED_ADMIN_CLERK_ID = process.env.SEED_ADMIN_CLERK_ID;
const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!ADMIN_ONLY && !CLERK_SECRET_KEY) {
  console.error(
    'Missing CLERK_SECRET_KEY (required for full UAT seed). Use --admin-only to skip Clerk user creation.',
  );
  process.exit(1);
}

if (ADMIN_ONLY && !SEED_ADMIN_CLERK_ID) {
  console.error(
    'Missing SEED_ADMIN_CLERK_ID (required for --admin-only mode). Set it in .env.local.',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TEST_PASSWORD = process.env.TEST_PASSWORD ?? 'TestPassword123!';

interface TestUser {
  roleKey: string;
  firstName: string;
  lastName: string;
  email: string;
  divisionCodes: string[]; // which divisions this user belongs to
  scope: 'internal' | 'external';
}

const TEST_USERS: TestUser[] = [
  // Internal roles
  {
    roleKey: 'platform_admin',
    firstName: 'Admin',
    lastName: 'Test',
    email: 'admin@krewpact-test.com',
    divisionCodes: ['contracting', 'homes', 'wood', 'telecom', 'group-inc', 'management'],
    scope: 'internal',
  },
  {
    roleKey: 'executive',
    firstName: 'Exec',
    lastName: 'Test',
    email: 'exec@krewpact-test.com',
    divisionCodes: ['contracting', 'homes', 'wood', 'telecom', 'group-inc', 'management'],
    scope: 'internal',
  },
  {
    roleKey: 'operations_manager',
    firstName: 'OpsMgr',
    lastName: 'Test',
    email: 'opsmgr@krewpact-test.com',
    divisionCodes: ['contracting', 'homes'],
    scope: 'internal',
  },
  {
    roleKey: 'project_manager',
    firstName: 'PM',
    lastName: 'Test',
    email: 'pm@krewpact-test.com',
    divisionCodes: ['contracting'],
    scope: 'internal',
  },
  {
    roleKey: 'project_coordinator',
    firstName: 'Coordinator',
    lastName: 'Test',
    email: 'coordinator@krewpact-test.com',
    divisionCodes: ['contracting'],
    scope: 'internal',
  },
  {
    roleKey: 'estimator',
    firstName: 'Estimator',
    lastName: 'Test',
    email: 'estimator@krewpact-test.com',
    divisionCodes: ['contracting', 'homes'],
    scope: 'internal',
  },
  {
    roleKey: 'field_supervisor',
    firstName: 'Field',
    lastName: 'Test',
    email: 'field@krewpact-test.com',
    divisionCodes: ['contracting'],
    scope: 'internal',
  },
  {
    roleKey: 'accounting',
    firstName: 'Accounting',
    lastName: 'Test',
    email: 'accounting@krewpact-test.com',
    divisionCodes: ['contracting', 'homes', 'wood', 'telecom', 'group-inc', 'management'],
    scope: 'internal',
  },
  {
    roleKey: 'payroll_admin',
    firstName: 'Payroll',
    lastName: 'Test',
    email: 'payroll@krewpact-test.com',
    divisionCodes: ['contracting', 'homes', 'wood', 'telecom', 'group-inc', 'management'],
    scope: 'internal',
  },
  // External roles
  {
    roleKey: 'client_owner',
    firstName: 'ClientOwner',
    lastName: 'Test',
    email: 'client-owner@krewpact-test.com',
    divisionCodes: ['contracting'],
    scope: 'external',
  },
  {
    roleKey: 'client_delegate',
    firstName: 'ClientDelegate',
    lastName: 'Test',
    email: 'client-delegate@krewpact-test.com',
    divisionCodes: ['contracting'],
    scope: 'external',
  },
  {
    roleKey: 'trade_partner_admin',
    firstName: 'TradeAdmin',
    lastName: 'Test',
    email: 'trade-admin@krewpact-test.com',
    divisionCodes: ['contracting'],
    scope: 'external',
  },
  {
    roleKey: 'trade_partner_user',
    firstName: 'TradeUser',
    lastName: 'Test',
    email: 'trade-user@krewpact-test.com',
    divisionCodes: ['contracting'],
    scope: 'external',
  },
];

async function clerkApiCall(path: string, method: string, body?: unknown) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Clerk API ${method} ${path} failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function getOrgId(): Promise<string> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', 'acme-construction')
    .single();

  if (error || !data) throw new Error(`Org not found. Run seed-org.ts first: ${error?.message}`);
  return data.id;
}

async function getDivisionIds(orgId: string, codes: string[]): Promise<string[]> {
  const { data, error } = await supabase
    .from('divisions')
    .select('id')
    .eq('org_id', orgId)
    .in('code', codes);

  if (error) throw new Error(`Failed to fetch divisions: ${error.message}`);
  return (data ?? []).map((d) => d.id);
}

async function getRoleId(roleKey: string): Promise<string> {
  const { data, error } = await supabase
    .from('roles')
    .select('id')
    .eq('role_key', roleKey)
    .single();

  if (error || !data) throw new Error(`Role ${roleKey} not found: ${error?.message}`);
  return data.id;
}

async function seedAdminOnly(orgId: string): Promise<void> {
  const clerkId = SEED_ADMIN_CLERK_ID!;
  const email = SEED_ADMIN_EMAIL;

  console.log(`  Admin-only mode: linking Clerk user ${clerkId} as platform_admin...`);

  // Check if already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .limit(1);

  let dbUserId: string;

  if (existing && existing.length > 0) {
    dbUserId = existing[0].id as string;
    console.log(`  Supabase user already exists (id: ${dbUserId})`);
  } else {
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .insert({ clerk_id: clerkId, email, full_name: 'Admin', org_id: orgId, is_active: true })
      .select('id')
      .single();

    if (userError || !dbUser) {
      throw new Error(`Failed to insert admin user: ${userError?.message}`);
    }
    dbUserId = dbUser.id as string;
    console.log(`  Created Supabase user (id: ${dbUserId})`);
  }

  // Assign platform_admin role
  const roleId = await getRoleId('platform_admin');
  await supabase
    .from('user_roles')
    .upsert({ user_id: dbUserId, role_id: roleId }, { onConflict: 'user_id,role_id' });
  console.log(`  Assigned role: platform_admin`);

  // Assign all divisions
  const allCodes = ['contracting', 'homes', 'wood', 'telecom', 'group-inc', 'management'];
  const divisionIds = await getDivisionIds(orgId, allCodes);
  if (divisionIds.length > 0) {
    const rows = divisionIds.map((divId) => ({ user_id: dbUserId, division_id: divId }));
    await supabase.from('user_divisions').upsert(rows, { onConflict: 'user_id,division_id' });
    console.log(`  Assigned ${divisionIds.length} divisions`);
  }

  // Update Clerk metadata
  if (CLERK_SECRET_KEY) {
    try {
      await clerkApiCall(`/users/${clerkId}/metadata`, 'PATCH', {
        public_metadata: {
          krewpact_user_id: dbUserId,
          division_ids: divisionIds,
          role_keys: ['platform_admin'],
        },
      });
      console.log(`  Updated Clerk metadata`);
    } catch (err) {
      console.warn(`  Warning: Could not update Clerk metadata (non-fatal): ${err}`);
    }
  } else {
    console.warn(`  Skipped Clerk metadata update (CLERK_SECRET_KEY not set)`);
    console.warn(`  Manually set public_metadata on Clerk user ${clerkId}:`);
    console.warn(`    krewpact_user_id: ${dbUserId}`);
    console.warn(`    division_ids: ${JSON.stringify(divisionIds)}`);
    console.warn(`    role_keys: ["platform_admin"]`);
  }

  console.log(`\nDone: platform_admin seeded (clerk: ${clerkId}, db: ${dbUserId})`);
}

async function main() {
  console.log('Fetching org and division data...');
  const orgId = await getOrgId();

  if (ADMIN_ONLY) {
    await seedAdminOnly(orgId);
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const user of TEST_USERS) {
    console.log(`  Processing ${user.roleKey} (${user.email})...`);

    // Check if user already exists in Supabase
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.email)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`    Skipped (already exists)`);
      skipped++;
      continue;
    }

    // Create Clerk user
    let clerkUser: { id: string };
    try {
      clerkUser = await clerkApiCall('/users', 'POST', {
        email_address: [user.email],
        password: TEST_PASSWORD,
        first_name: user.firstName,
        last_name: user.lastName,
        skip_password_checks: true,
      });
    } catch (err) {
      console.error(`    Clerk create failed: ${err}`);
      continue;
    }

    // Insert Supabase user
    const { data: dbUser, error: userError } = await supabase
      .from('users')
      .insert({
        clerk_id: clerkUser.id,
        email: user.email,
        full_name: `${user.firstName} ${user.lastName}`,
        org_id: orgId,
        is_active: true,
      })
      .select('id')
      .single();

    if (userError || !dbUser) {
      console.error(`    Supabase user insert failed: ${userError?.message}`);
      continue;
    }

    // Insert user_roles
    const roleId = await getRoleId(user.roleKey);
    await supabase.from('user_roles').insert({
      user_id: dbUser.id,
      role_id: roleId,
    });

    // Insert user_divisions
    const divisionIds = await getDivisionIds(orgId, user.divisionCodes);
    if (divisionIds.length > 0) {
      await supabase.from('user_divisions').insert(
        divisionIds.map((divId) => ({
          user_id: dbUser.id,
          division_id: divId,
        })),
      );
    }

    // Update Clerk public_metadata with KrewPact claims
    await clerkApiCall(`/users/${clerkUser.id}/metadata`, 'PATCH', {
      public_metadata: {
        krewpact_user_id: dbUser.id,
        division_ids: divisionIds,
        role_keys: [user.roleKey],
      },
    });

    console.log(`    Created (clerk: ${clerkUser.id}, db: ${dbUser.id})`);
    created++;
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
  console.log(`Test password for all users: ${TEST_PASSWORD}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
