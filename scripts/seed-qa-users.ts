/**
 * Seed QA test users for multi-role production E2E testing.
 *
 * Creates 4 users in Clerk (production) + Supabase with different roles/divisions
 * for use with `npm run qa:e2e` via @clerk/testing.
 *
 * Usage: npx tsx scripts/seed-qa-users.ts
 *
 * Required env vars (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CLERK_SECRET_KEY
 *   QA_TEST_PASSWORD  — shared password for all QA users (must meet Clerk password policy)
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const QA_PASSWORD = process.env.QA_TEST_PASSWORD;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!CLERK_SECRET_KEY) {
  console.error('Missing: CLERK_SECRET_KEY');
  process.exit(1);
}
if (!QA_PASSWORD) {
  console.error('Missing: QA_TEST_PASSWORD (shared password for QA users)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Production IDs (from Supabase query)
const ORG_ID = 'e076c9b9-72ce-4fdc-a031-e5808e73d92c';
const DIVISIONS = {
  contracting: 'be7931f8-bd30-4307-955d-1a10c59f5860',
  homes: '06014b0f-1d89-4188-9985-a66b34696bc9',
  wood: '90fd5f6b-9ff5-4adf-981e-11c762c9cb69',
  telecom: 'f620691b-c153-4427-b8c4-9d36ece8eac9',
  'group-inc': '3f70b3fe-47d3-4094-bf7a-b3f4a4dcbab4',
  management: '41e7ee09-2a2a-4cd6-b8aa-11131a099392',
} as const;
const ROLES = {
  platform_admin: 'a32bef3d-cb69-40ec-b674-1722d89a6cee',
  executive: '155e0806-9057-4eed-805c-97e39c8e81a0',
  operations_manager: '5baec73b-bbeb-4a6c-ad51-312bd803fc21',
  project_manager: '2c1e8336-b0cd-43b1-b7f0-80a670fad7d0',
  project_coordinator: '408e473c-6dc5-4982-b855-d482232475f2',
  estimator: 'ae694783-0f56-4036-bd96-857b16204779',
  field_supervisor: '0dfbc832-0e01-4cea-bf2a-ae6d76def3fc',
  accounting: '73f9b9aa-ead7-4668-a75d-dc69e0699e9a',
  payroll_admin: '8f9f53cd-655a-4574-8edf-3880b4588274',
} as const;

interface QAUser {
  email: string;
  firstName: string;
  lastName: string;
  roleKey: keyof typeof ROLES;
  divisionCodes: (keyof typeof DIVISIONS)[];
}

const ALL_DIVISIONS: (keyof typeof DIVISIONS)[] = [
  'contracting',
  'homes',
  'wood',
  'telecom',
  'group-inc',
  'management',
];

const QA_USERS: QAUser[] = [
  {
    email: 'qa-admin@mdmgroupinc.ca',
    firstName: 'QA-Admin',
    lastName: 'Test',
    roleKey: 'platform_admin',
    divisionCodes: ALL_DIVISIONS,
  },
  {
    email: 'qa-exec@mdmgroupinc.ca',
    firstName: 'QA-Executive',
    lastName: 'Test',
    roleKey: 'executive',
    divisionCodes: ALL_DIVISIONS,
  },
  {
    email: 'qa-opsmgr@mdmgroupinc.ca',
    firstName: 'QA-OpsMgr',
    lastName: 'Test',
    roleKey: 'operations_manager',
    divisionCodes: ['contracting', 'homes'],
  },
  {
    email: 'qa-pm@mdmgroupinc.ca',
    firstName: 'QA-PM',
    lastName: 'Test',
    roleKey: 'project_manager',
    divisionCodes: ['contracting'],
  },
  {
    email: 'qa-coord@mdmgroupinc.ca',
    firstName: 'QA-Coordinator',
    lastName: 'Test',
    roleKey: 'project_coordinator',
    divisionCodes: ['contracting'],
  },
  {
    email: 'qa-estimator@mdmgroupinc.ca',
    firstName: 'QA-Estimator',
    lastName: 'Test',
    roleKey: 'estimator',
    divisionCodes: ['homes', 'contracting'],
  },
  {
    email: 'qa-field@mdmgroupinc.ca',
    firstName: 'QA-Field',
    lastName: 'Test',
    roleKey: 'field_supervisor',
    divisionCodes: ['contracting'],
  },
  {
    email: 'qa-accounting@mdmgroupinc.ca',
    firstName: 'QA-Accounting',
    lastName: 'Test',
    roleKey: 'accounting',
    divisionCodes: ALL_DIVISIONS,
  },
  {
    email: 'qa-payroll@mdmgroupinc.ca',
    firstName: 'QA-Payroll',
    lastName: 'Test',
    roleKey: 'payroll_admin',
    divisionCodes: ALL_DIVISIONS,
  },
];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function clerkApi(
  path: string,
  method: string,
  body?: unknown,
  retries = 3,
): Promise<Record<string, unknown>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`https://api.clerk.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.ok) return res.json() as Promise<Record<string, unknown>>;

    if (res.status === 429 && attempt < retries) {
      const wait = parseInt(res.headers.get('retry-after') ?? '3', 10);
      console.warn(`  Clerk 429 — waiting ${wait}s (attempt ${attempt}/${retries})`);
      await sleep(wait * 1000);
      continue;
    }
    if (res.status >= 500 && attempt < retries) {
      await sleep(attempt * 2000);
      continue;
    }

    const text = await res.text();
    // 422 on create usually means user already exists
    if (res.status === 422 && method === 'POST' && text.includes('already exists')) {
      console.log(`  Clerk user already exists, looking up...`);
      return { already_exists: true } as Record<string, unknown>;
    }
    throw new Error(`Clerk ${method} ${path} failed (${res.status}): ${text}`);
  }
  throw new Error(`Clerk ${method} ${path} exhausted retries`);
}

async function findClerkUser(email: string): Promise<string | null> {
  const result = (await clerkApi(
    `/users?email_address=${encodeURIComponent(email)}`,
    'GET',
  )) as unknown as Array<{ id: string }>;
  if (Array.isArray(result) && result.length > 0) return result[0].id;
  return null;
}

async function seedQAUser(user: QAUser): Promise<void> {
  console.log(`\n--- ${user.email} (${user.roleKey}) ---`);

  // 1. Create or find Clerk user
  let clerkId = await findClerkUser(user.email);

  if (!clerkId) {
    const username = user.email.split('@')[0].replace(/[^a-z0-9_-]/gi, '-');
    const result = await clerkApi('/users', 'POST', {
      email_address: [user.email],
      username,
      first_name: user.firstName,
      last_name: user.lastName,
      password: QA_PASSWORD,
      skip_password_checks: false,
    });

    if (result.already_exists) {
      clerkId = await findClerkUser(user.email);
    } else {
      clerkId = result.id as string;
    }
  }

  if (!clerkId) throw new Error(`Could not create or find Clerk user for ${user.email}`);
  console.log(`  Clerk user: ${clerkId}`);

  // 2. Create or find Supabase user
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkId)
    .limit(1);

  let dbUserId: string;

  if (existing && existing.length > 0) {
    dbUserId = existing[0].id;
    console.log(`  Supabase user exists: ${dbUserId}`);
  } else {
    const { data: created, error } = await supabase
      .from('users')
      .insert({
        clerk_user_id: clerkId,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        org_id: ORG_ID,
        status: 'active',
      })
      .select('id')
      .single();

    if (error || !created) throw new Error(`Supabase user insert failed: ${error?.message}`);
    dbUserId = created.id;
    console.log(`  Created Supabase user: ${dbUserId}`);
  }

  // 3. Assign role (upsert)
  const roleId = ROLES[user.roleKey];
  await supabase
    .from('user_roles')
    .upsert({ user_id: dbUserId, role_id: roleId }, { onConflict: 'user_id,role_id' });
  console.log(`  Role: ${user.roleKey}`);

  // 4. Assign divisions (upsert)
  const divisionIds = user.divisionCodes.map((code) => DIVISIONS[code]);
  const divRows = divisionIds.map((divId) => ({ user_id: dbUserId, division_id: divId }));
  await supabase.from('user_divisions').upsert(divRows, { onConflict: 'user_id,division_id' });
  console.log(`  Divisions: ${user.divisionCodes.join(', ')}`);

  // 5. Update Clerk publicMetadata
  await clerkApi(`/users/${clerkId}/metadata`, 'PATCH', {
    public_metadata: {
      krewpact_user_id: dbUserId,
      krewpact_org_id: ORG_ID,
      division_ids: divisionIds,
      role_keys: [user.roleKey],
    },
  });
  console.log(`  Clerk metadata updated`);

  // 6. Verify: read back and compare
  const verifyRes = (await clerkApi(`/users/${clerkId}`, 'GET')) as {
    public_metadata?: { krewpact_user_id?: string; division_ids?: string[] };
  };
  const meta = verifyRes.public_metadata;
  if (meta?.krewpact_user_id !== dbUserId) {
    throw new Error(`VERIFY FAILED: krewpact_user_id mismatch for ${user.email}`);
  }
  if (JSON.stringify(meta?.division_ids?.sort()) !== JSON.stringify(divisionIds.sort())) {
    throw new Error(`VERIFY FAILED: division_ids mismatch for ${user.email}`);
  }
  console.log(`  Verified OK`);
}

async function main() {
  console.log('Seeding QA test users for multi-role production E2E...\n');
  console.log(`Org: MDM Group Inc. (${ORG_ID})`);
  console.log(`Users to create: ${QA_USERS.length}`);

  for (const user of QA_USERS) {
    await seedQAUser(user);
    await sleep(500); // gentle rate limiting
  }

  console.log('\n=== QA Users Ready ===');
  console.log('Run E2E as each user:');
  for (const user of QA_USERS) {
    console.log(`  QA_TEST_EMAIL=${user.email} QA_TEST_PASSWORD=$QA_TEST_PASSWORD npm run qa:e2e`);
  }
  console.log('\nTo run all roles in sequence:');
  console.log('  npm run qa:e2e:multi  (add this script to package.json)');
}

main().catch((err) => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
