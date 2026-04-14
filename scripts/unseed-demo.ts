/**
 * Remove demo workflow rows created by `seed-demo-workflow.ts`.
 *
 * Deletion order respects FK constraints:
 *   estimate_lines → estimates → opportunities → projects → contacts → leads → accounts
 *
 * Safe to run when seed has not been applied — it's a no-op per entity.
 *
 * Usage:
 *   tsx --env-file=.env.local scripts/unseed-demo.ts [--dry-run] [--org mdm-group]
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';

const args = new Set(process.argv.slice(2));
const flag = (name: string): string | undefined => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
};
const DRY_RUN = args.has('--dry-run');
const ORG_SLUG = flag('--org') ?? 'mdm-group';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEMO = {
  accountCompanyCode: 'DEMO-ACCT-001',
  leadExternalId: 'DEMO-LEAD-001',
  contactEmail: 'demo-primary@lakeshore.example',
  opportunityName: '[DEMO] Lakeshore Condo Tower — Phase 2',
  estimateNumber: 'DEMO-EST-001',
  projectNumber: 'DEMO-PROJ-001',
};

async function resolveOrgId(): Promise<string> {
  const { data, error } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', ORG_SLUG)
    .single();
  if (error || !data)
    throw new Error(`Organization slug "${ORG_SLUG}" not found: ${error?.message ?? 'no row'}`);
  return data.id as string;
}

async function deleteByLookup(
  table: string,
  orgId: string,
  column: string,
  value: string,
): Promise<number> {
  const { data: rows, error: selErr } = await supabase
    .from(table)
    .select('id')
    .eq('org_id', orgId)
    .eq(column, value);
  if (selErr) throw new Error(`lookup ${table}.${column} failed: ${selErr.message}`);
  if (!rows || rows.length === 0) {
    console.log(`  ${table.padEnd(18)} 0 rows (nothing to delete)`);
    return 0;
  }
  if (DRY_RUN) {
    console.log(`  ${table.padEnd(18)} would delete ${rows.length} row(s)`);
    return rows.length;
  }
  const { error: delErr } = await supabase
    .from(table)
    .delete()
    .eq('org_id', orgId)
    .eq(column, value);
  if (delErr) throw new Error(`delete ${table}.${column} failed: ${delErr.message}`);
  console.log(`  ${table.padEnd(18)} deleted ${rows.length} row(s)`);
  return rows.length;
}

async function main() {
  console.log(`\n=== Unseed demo workflow ===`);
  console.log(`  org:     ${ORG_SLUG}`);
  console.log(`  dry-run: ${DRY_RUN}\n`);

  const orgId = await resolveOrgId();

  const { data: est } = await supabase
    .from('estimates')
    .select('id')
    .eq('org_id', orgId)
    .eq('estimate_number', DEMO.estimateNumber)
    .maybeSingle();
  if (est?.id) {
    if (DRY_RUN) {
      const { count } = await supabase
        .from('estimate_lines')
        .select('id', { count: 'exact', head: true })
        .eq('estimate_id', est.id);
      console.log(`  estimate_lines     would delete ${count ?? 0} row(s)`);
    } else {
      const { error, count } = await supabase
        .from('estimate_lines')
        .delete({ count: 'exact' })
        .eq('estimate_id', est.id);
      if (error) throw new Error(`delete estimate_lines failed: ${error.message}`);
      console.log(`  estimate_lines     deleted ${count ?? 0} row(s)`);
    }
  } else {
    console.log(`  estimate_lines     0 rows (no parent estimate)`);
  }

  await deleteByLookup('estimates', orgId, 'estimate_number', DEMO.estimateNumber);
  await deleteByLookup('opportunities', orgId, 'opportunity_name', DEMO.opportunityName);
  await deleteByLookup('projects', orgId, 'project_number', DEMO.projectNumber);
  await deleteByLookup('contacts', orgId, 'email', DEMO.contactEmail);
  await deleteByLookup('leads', orgId, 'external_id', DEMO.leadExternalId);
  await deleteByLookup('accounts', orgId, 'company_code', DEMO.accountCompanyCode);

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Unseed failed:', err);
  process.exit(1);
});
