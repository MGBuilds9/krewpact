/* eslint-disable no-console */
/**
 * Seed an organization (org + settings + divisions + roles)
 * Usage: npx tsx scripts/seed-org.ts --file supabase/seed/seed-org-mdm.json
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const fileFlag = process.argv.findIndex((arg) => arg === '--file');
const filePath = fileFlag >= 0 ? process.argv[fileFlag + 1] : 'supabase/seed/seed-org-mdm.json';

const seed = JSON.parse(readFileSync(filePath, 'utf-8')) as {
  organization: {
    name: string;
    slug: string;
    timezone?: string;
    locale?: string;
    metadata?: Record<string, unknown>;
  };
  org_settings?: {
    branding?: Record<string, unknown>;
    workflow?: Record<string, unknown>;
    feature_flags?: Record<string, unknown>;
  };
  divisions?: { code: string; name: string; description?: string }[];
  roles?: { role_key: string; role_name: string; scope?: string }[];
};

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertOrg() {
  const { data, error } = await supabase
    .from('organizations')
    .upsert(
      {
        name: seed.organization.name,
        slug: seed.organization.slug,
        timezone: seed.organization.timezone ?? 'America/Toronto',
        locale: seed.organization.locale ?? 'en-CA',
        metadata: seed.organization.metadata ?? {},
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert organization: ${error?.message}`);
  }
  return data.id as string;
}

async function upsertOrgSettings(orgId: string) {
  const settings = seed.org_settings ?? { branding: {}, workflow: {}, feature_flags: {} };
  const { error } = await supabase.from('org_settings').upsert(
    {
      org_id: orgId,
      branding: settings.branding ?? {},
      workflow: settings.workflow ?? {},
      feature_flags: settings.feature_flags ?? {},
    },
    { onConflict: 'org_id' },
  );

  if (error) throw new Error(`Failed to upsert org_settings: ${error.message}`);
}

async function upsertDivisions(orgId: string) {
  const divisions = seed.divisions ?? [];
  if (!divisions.length) return;
  const rows = divisions.map((d) => ({ ...d, org_id: orgId }));
  const { error } = await supabase.from('divisions').upsert(rows, { onConflict: 'org_id,code' });
  if (error) throw new Error(`Failed to upsert divisions: ${error.message}`);
}

async function upsertRoles() {
  const roles = seed.roles ?? [];
  if (!roles.length) return;
  const { error } = await supabase.from('roles').upsert(roles, { onConflict: 'role_key' });
  if (error) throw new Error(`Failed to upsert roles: ${error.message}`);
}

async function main() {
  console.log('🏗️  Seeding organization...');
  const orgId = await upsertOrg();
  await upsertOrgSettings(orgId);
  await upsertDivisions(orgId);
  await upsertRoles();
  console.log('✅ Seed complete:', seed.organization.slug);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
