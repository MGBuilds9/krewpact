/**
 * Provision real MDM employees from M365 into Clerk + Supabase.
 *
 * Usage: npx tsx scripts/provision-mdm-users.ts
 *
 * Idempotent — safe to re-run. Finds or creates each user.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DEFAULT_PASSWORD = process.env.QA_TEST_PASSWORD!;

if (!CLERK_SECRET_KEY || !SUPABASE_URL || !SUPABASE_KEY || !DEFAULT_PASSWORD) {
  console.error(
    'Missing env vars: CLERK_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QA_TEST_PASSWORD',
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ORG_ID = 'e076c9b9-72ce-4fdc-a031-e5808e73d92c';
const DIVS: Record<string, string> = {
  contracting: 'be7931f8-bd30-4307-955d-1a10c59f5860',
  homes: '06014b0f-1d89-4188-9985-a66b34696bc9',
  wood: '90fd5f6b-9ff5-4adf-981e-11c762c9cb69',
  telecom: 'f620691b-c153-4427-b8c4-9d36ece8eac9',
  'group-inc': '3f70b3fe-47d3-4094-bf7a-b3f4a4dcbab4',
  management: '41e7ee09-2a2a-4cd6-b8aa-11131a099392',
};
const ALL_DIVS = Object.keys(DIVS);

// Role IDs from Supabase
const ROLE_IDS: Record<string, string> = {
  platform_admin: '7a92c0e2-19c2-4f63-83e6-d8fc8eff6daa',
  executive: '155e0806-9057-4eed-805c-97e39c8e81a0',
  operations_manager: 'c5e6a8b1-3d7f-4e2a-9c1b-8f5d3a6e7b2c',
  project_manager: '2c1e8336-b0cd-43b1-b7f0-80a670fad7d0',
  project_coordinator: 'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  estimator: 'ae694783-0f56-4036-bd96-857b16204779',
  field_supervisor: '0dfbc832-0e01-4cea-bf2a-ae6d76def3fc',
  accounting: 'b3c4d5e6-7f8a-9b0c-1d2e-3f4a5b6c7d8e',
  payroll_admin: 'd4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
};

interface MDMUser {
  email: string;
  first: string;
  last: string;
  role: string;
  divisions: string[];
}

const USERS: MDMUser[] = [
  {
    email: 'daliasidhom@mdmcontracting.ca',
    first: 'Dalia',
    last: 'Sidhom',
    role: 'estimator',
    divisions: ['contracting'],
  },
  {
    email: 'david.guirguis@mdmcontracting.ca',
    first: 'David',
    last: 'Guirguis',
    role: 'project_manager',
    divisions: ALL_DIVS,
  },
  {
    email: 'david.mikhail@mdmgroupinc.ca',
    first: 'David',
    last: 'Mikhail',
    role: 'operations_manager',
    divisions: ['group-inc', 'contracting'],
  },
  {
    email: 'ehabk@mdmcontracting.ca',
    first: 'Ehab',
    last: 'Guirguis',
    role: 'executive',
    divisions: ALL_DIVS,
  },
  {
    email: 'fady.gorgy@mdmgroupinc.ca',
    first: 'Fady',
    last: 'Gorgy',
    role: 'field_supervisor',
    divisions: ['contracting', 'group-inc'],
  },
  {
    email: 'hani@mdmcontracting.ca',
    first: 'Hani',
    last: 'Abdelmalek',
    role: 'project_coordinator',
    divisions: ['contracting'],
  },
  {
    email: 'helena.awad@mdmcontracting.ca',
    first: 'Helena',
    last: 'Awad',
    role: 'project_coordinator',
    divisions: ['contracting'],
  },
  {
    email: 'mahmoud.assi@mdmtelecom.ca',
    first: 'Mahmoud',
    last: 'Assi',
    role: 'operations_manager',
    divisions: ['telecom'],
  },
  {
    email: 'marian.alfons@mdmgroupinc.ca',
    first: 'Marian',
    last: 'Alfons',
    role: 'accounting',
    divisions: ALL_DIVS,
  },
  {
    email: 'mary.guirguis@mdmgroupinc.ca',
    first: 'Mary',
    last: 'Guirguis',
    role: 'payroll_admin',
    divisions: ALL_DIVS,
  },
  {
    email: 'nagy.salib@mdmgroupinc.ca',
    first: 'Nagy',
    last: 'Salib',
    role: 'project_coordinator',
    divisions: ['group-inc', 'contracting'],
  },
  {
    email: 'nervine@mdmgroupinc.ca',
    first: 'Nervine',
    last: 'Wassef',
    role: 'executive',
    divisions: ALL_DIVS,
  },
  {
    email: 'karan.singh@mdmgroupinc.ca',
    first: 'Prabhkaran',
    last: 'Singh',
    role: 'field_supervisor',
    divisions: ['wood', 'contracting'],
  },
  {
    email: 'ragy.awadallah@mdmgroupinc.ca',
    first: 'Ragy',
    last: 'Awadallah',
    role: 'accounting',
    divisions: ALL_DIVS,
  },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.ok) return res.json() as Promise<Record<string, unknown>>;
    if (res.status === 429 && attempt < retries) {
      await sleep(3000);
      continue;
    }
    if (res.status >= 500 && attempt < retries) {
      await sleep(2000 * attempt);
      continue;
    }
    const text = await res.text();
    if (res.status === 422 && text.includes('already exists')) return { already_exists: true };
    throw new Error(`Clerk ${method} ${path} (${res.status}): ${text.substring(0, 200)}`);
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

async function provisionUser(user: MDMUser): Promise<void> {
  console.log(`\n--- ${user.email} (${user.role}) ---`);

  // 1. Find or create Clerk user
  let clerkId = await findClerkUser(user.email);
  if (clerkId) {
    console.log(`  Clerk: exists (${clerkId.substring(0, 20)}...)`);
  } else {
    const username = user.email.split('@')[0].replace(/[^a-z0-9_-]/gi, '-');
    const result = await clerkApi('/users', 'POST', {
      email_address: [user.email],
      username,
      first_name: user.first,
      last_name: user.last,
      password: DEFAULT_PASSWORD,
      skip_password_checks: false,
    });
    if (result.already_exists) {
      clerkId = await findClerkUser(user.email);
    } else {
      clerkId = result.id as string;
    }
    if (!clerkId) {
      console.error('  ERROR: Could not create/find Clerk user');
      return;
    }
    console.log(`  Clerk: created (${clerkId.substring(0, 20)}...)`);
  }

  // 2. Find or create Supabase user
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkId)
    .limit(1);
  let dbId: string;
  if (existing && existing.length > 0) {
    dbId = existing[0].id;
    console.log(`  Supabase: exists (${dbId.substring(0, 12)}...)`);
  } else {
    const { data: created, error } = await supabase
      .from('users')
      .insert({
        clerk_user_id: clerkId,
        email: user.email,
        first_name: user.first,
        last_name: user.last,
        org_id: ORG_ID,
        status: 'active',
      })
      .select('id')
      .single();
    if (error || !created) {
      console.error(`  ERROR: Supabase insert failed: ${error?.message}`);
      return;
    }
    dbId = created.id;
    console.log(`  Supabase: created (${dbId.substring(0, 12)}...)`);
  }

  // 3. Assign role
  const roleId = ROLE_IDS[user.role];
  if (roleId) {
    await supabase
      .from('user_roles')
      .upsert({ user_id: dbId, role_id: roleId }, { onConflict: 'user_id,role_id' });
    console.log(`  Role: ${user.role}`);
  }

  // 4. Assign divisions
  const divIds = user.divisions.map((d) => DIVS[d]);
  const divRows = divIds.map((divId) => ({ user_id: dbId, division_id: divId }));
  await supabase.from('user_divisions').upsert(divRows, { onConflict: 'user_id,division_id' });
  console.log(`  Divisions: ${user.divisions.join(', ')}`);

  // 5. Update Clerk metadata
  await clerkApi(`/users/${clerkId}/metadata`, 'PATCH', {
    public_metadata: {
      krewpact_user_id: dbId,
      krewpact_org_id: ORG_ID,
      division_ids: divIds,
      role_keys: [user.role],
    },
  });
  console.log(`  Metadata: updated`);
}

async function main() {
  console.log(`Provisioning ${USERS.length} MDM employees into Clerk + Supabase...\n`);
  let success = 0;
  for (const user of USERS) {
    try {
      await provisionUser(user);
      success++;
      await sleep(500);
    } catch (err) {
      console.error(`  FAILED: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  console.log(`\n=== ${success}/${USERS.length} provisioned successfully ===`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
