/**
 * One-time reconciliation script: fix Clerk publicMetadata ↔ Supabase user_roles divergence.
 *
 * Dry-run (default): npx tsx scripts/fix-rbac-sync.ts
 * Apply changes:     npx tsx scripts/fix-rbac-sync.ts --apply
 *
 * Required env vars (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   CLERK_SECRET_KEY
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLERK_KEY = process.env.CLERK_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!CLERK_KEY) {
  console.error('Missing CLERK_SECRET_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function clerkGet(path: string): Promise<unknown> {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    headers: { Authorization: `Bearer ${CLERK_KEY}` },
  });
  if (!res.ok) throw new Error(`Clerk GET ${path} failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function clerkPatch(path: string, body: unknown): Promise<void> {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${CLERK_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Clerk PATCH ${path} failed (${res.status}): ${await res.text()}`);
}

interface DbUser {
  id: string;
  clerk_user_id: string;
  email: string | null;
}

interface UserRoleRow {
  roles: unknown;
}

interface UserDivision {
  division_id: string;
}

interface ClerkUser {
  public_metadata: {
    role_keys?: string[];
    division_ids?: string[];
    krewpact_user_id?: string;
  };
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

  const { data: users, error } = await supabase
    .from('users')
    .select('id, clerk_user_id, email')
    .not('clerk_user_id', 'is', null);

  if (error) throw new Error(`Failed to fetch users: ${error.message}`);
  const dbUsers = (users ?? []) as DbUser[];
  console.log(`Found ${dbUsers.length} users with clerk_user_id\n`);

  let divergent = 0;
  let applied = 0;

  for (const user of dbUsers) {
    const clerkId = user.clerk_user_id;

    // Fetch DB roles
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('roles(role_key)')
      .eq('user_id', user.id);
    const dbRoles = ((roleRows ?? []) as UserRoleRow[])
      .map((r) => (r.roles as { role_key: string } | null)?.role_key)
      .filter((k): k is string => !!k);

    // Fetch DB divisions
    const { data: divRows } = await supabase
      .from('user_divisions')
      .select('division_id')
      .eq('user_id', user.id);
    const dbDivisions = ((divRows ?? []) as UserDivision[]).map((d) => d.division_id);

    // Fetch Clerk metadata
    let clerkMeta: ClerkUser['public_metadata'] = {};
    try {
      const clerkUser = (await clerkGet(`/users/${clerkId}`)) as ClerkUser;
      clerkMeta = clerkUser.public_metadata ?? {};
    } catch (err) {
      console.warn(`  [WARN] Could not fetch Clerk user ${clerkId}: ${err}`);
      continue;
    }

    const clerkRoles = clerkMeta.role_keys ?? [];
    const clerkDivisions = clerkMeta.division_ids ?? [];

    // Merge: union of both sides
    const mergedRoles = [...new Set([...dbRoles, ...clerkRoles])];
    const mergedDivisions = [...new Set([...dbDivisions, ...clerkDivisions])];

    // Special case: admin email always gets platform_admin
    if (user.email === ADMIN_EMAIL && !mergedRoles.includes('platform_admin')) {
      mergedRoles.push('platform_admin');
    }

    // Detect divergence
    const rolesDiverge =
      mergedRoles.length !== clerkRoles.length ||
      mergedRoles.some((r) => !clerkRoles.includes(r)) ||
      dbRoles.length !== mergedRoles.length;
    const divsDiverge =
      mergedDivisions.length !== clerkDivisions.length ||
      mergedDivisions.some((d) => !clerkDivisions.includes(d)) ||
      dbDivisions.length !== mergedDivisions.length;
    const idMissing = clerkMeta.krewpact_user_id !== user.id;

    if (!rolesDiverge && !divsDiverge && !idMissing) continue;

    divergent++;
    console.log(`[DIVERGENT] ${user.email ?? user.id} (clerk: ${clerkId})`);
    if (rolesDiverge)
      console.log(`  roles  — db: [${dbRoles}]  clerk: [${clerkRoles}]  merged: [${mergedRoles}]`);
    if (divsDiverge)
      console.log(
        `  divs   — db: ${dbDivisions.length}  clerk: ${clerkDivisions.length}  merged: ${mergedDivisions.length}`,
      );
    if (idMissing) console.log(`  krewpact_user_id missing or wrong in Clerk`);

    if (APPLY) {
      // Upsert missing roles in Supabase
      const missingRoles = mergedRoles.filter((r) => !dbRoles.includes(r));
      for (const roleKey of missingRoles) {
        const { data: roleRow } = await supabase
          .from('roles')
          .select('id')
          .eq('role_key', roleKey)
          .single();
        if (roleRow) {
          await supabase
            .from('user_roles')
            .upsert({ user_id: user.id, role_id: roleRow.id }, { onConflict: 'user_id,role_id' });
        }
      }

      // Patch Clerk metadata
      await clerkPatch(`/users/${clerkId}/metadata`, {
        public_metadata: {
          krewpact_user_id: user.id,
          role_keys: mergedRoles,
          division_ids: mergedDivisions,
        },
      });
      console.log(`  → Applied`);
      applied++;
    } else {
      console.log(`  → Would update Clerk + upsert ${mergedRoles.filter((r) => !dbRoles.includes(r)).length} roles in DB`);
    }
  }

  console.log(
    `\nSummary: ${dbUsers.length} users, ${divergent} divergent, ${APPLY ? `${applied} applied` : `${divergent} would-apply (dry-run)`}`,
  );
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
