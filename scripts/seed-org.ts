/**
 * Seed MDM Group organization: org + settings + 6 divisions + 13 roles.
 *
 * Idempotent — upserts on slug / (org_id,code) / role_key. Safe to re-run.
 *
 * Optionally load from a JSON file:
 *   npx tsx scripts/seed-org.ts --file supabase/seed/seed-org-mdm.json
 *
 * Without --file, seeds MDM Group Inc. directly from inline data.
 *
 * Usage: npx tsx scripts/seed-org.ts
 *
 * Required env vars (in .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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

interface SeedData {
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
}

// Default MDM Group seed data (inline — no file required)
const MDM_SEED: SeedData = {
  organization: {
    name: 'Acme Construction Inc.',
    slug: 'acme-construction',
    timezone: 'America/Toronto',
    locale: 'en-CA',
    metadata: {
      industry: 'construction',
      address: process.env.COMPANY_ADDRESS ?? '123 Main St, Suite 100, City, ON A1B 2C3',
      phone: process.env.COMPANY_PHONE ?? '(555) 555-0100',
      email: process.env.COMPANY_EMAIL ?? 'info@example.com',
      website: 'https://example.com',
    },
  },
  org_settings: {
    branding: {
      company_name: 'Acme Construction Inc.',
      primary_color: '#0f172a',
      logo_url: '',
    },
    workflow: {},
    feature_flags: {},
  },
  divisions: [
    { code: 'contracting', name: 'Acme Contracting', description: 'General contracting division' },
    { code: 'homes', name: 'Acme Homes', description: 'Residential construction division' },
    { code: 'wood', name: 'Acme Lumber', description: 'Wood/lumber division' },
    { code: 'telecom', name: 'Acme Telecom', description: 'Telecommunications division' },
    {
      code: 'group-inc',
      name: 'Acme Construction Inc.',
      description: 'Parent company / corporate',
    },
    { code: 'management', name: 'Acme Management', description: 'Property management division' },
  ],
  roles: [
    // Internal (9)
    { role_key: 'platform_admin', role_name: 'Platform Admin', scope: 'company' },
    { role_key: 'executive', role_name: 'Executive', scope: 'company' },
    { role_key: 'operations_manager', role_name: 'Operations Manager', scope: 'division' },
    { role_key: 'project_manager', role_name: 'Project Manager', scope: 'project' },
    { role_key: 'project_coordinator', role_name: 'Project Coordinator', scope: 'project' },
    { role_key: 'estimator', role_name: 'Estimator', scope: 'division' },
    { role_key: 'field_supervisor', role_name: 'Field Supervisor', scope: 'project' },
    { role_key: 'accounting', role_name: 'Accounting', scope: 'company' },
    { role_key: 'payroll_admin', role_name: 'Payroll Admin', scope: 'company' },
    // External (4)
    { role_key: 'client_owner', role_name: 'Client Owner', scope: 'project' },
    { role_key: 'client_delegate', role_name: 'Client Delegate', scope: 'project' },
    { role_key: 'trade_partner_admin', role_name: 'Trade Partner Admin', scope: 'project' },
    { role_key: 'trade_partner_user', role_name: 'Trade Partner User', scope: 'project' },
  ],
};

// Load seed data: prefer --file arg, fall back to inline MDM data
const fileFlag = process.argv.findIndex((arg) => arg === '--file');
const seed: SeedData =
  fileFlag >= 0
    ? (JSON.parse(readFileSync(process.argv[fileFlag + 1], 'utf-8')) as SeedData)
    : MDM_SEED;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertOrg(): Promise<string> {
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
  console.log(`  Organization: ${seed.organization.name} (id: ${data.id})`);
  return data.id as string;
}

async function upsertOrgSettings(orgId: string): Promise<void> {
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
  console.log(`  Org settings: upserted`);
}

async function upsertDivisions(orgId: string): Promise<void> {
  const divisions = seed.divisions ?? [];
  if (!divisions.length) return;

  const rows = divisions.map((d) => ({ ...d, org_id: orgId }));
  const { error } = await supabase.from('divisions').upsert(rows, { onConflict: 'org_id,code' });

  if (error) throw new Error(`Failed to upsert divisions: ${error.message}`);
  console.log(`  Divisions: ${divisions.map((d) => d.code).join(', ')}`);
}

async function upsertRoles(): Promise<void> {
  const roles = seed.roles ?? [];
  if (!roles.length) return;

  const { error } = await supabase.from('roles').upsert(roles, { onConflict: 'role_key' });
  if (error) throw new Error(`Failed to upsert roles: ${error.message}`);
  console.log(`  Roles: ${roles.map((r) => r.role_key).join(', ')}`);
}

async function main() {
  console.log('Seeding organization...');
  const orgId = await upsertOrg();
  await upsertOrgSettings(orgId);
  await upsertDivisions(orgId);
  await upsertRoles();
  console.log(`\nDone: ${seed.organization.slug}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
