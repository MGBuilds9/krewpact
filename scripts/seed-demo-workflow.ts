/**
 * Seed a linked demo workflow so Michael can walk the UI against real data.
 *
 * Creates (idempotent upsert):
 *   - 1 account      — [DEMO] Lakeshore Properties Inc.
 *   - 1 lead         — [DEMO] Lakeshore Properties Inc.
 *   - 1 contact      — Demo Primary Contact (linked to the lead)
 *   - 1 opportunity  — [DEMO] Lakeshore Condo Tower — Phase 2 (stage=estimating)
 *   - 1 estimate     — DEMO-EST-001 (attached to the opportunity, with 3 lines)
 *   - 1 project      — DEMO-PROJ-001 (derived from the opportunity)
 *
 * Every row is tagged so a companion `unseed-demo.ts` can remove it cleanly:
 *   - accounts.company_code  = 'DEMO-ACCT-001'
 *   - leads.external_id      = 'DEMO-LEAD-001'
 *   - contacts.email         = 'demo-primary@lakeshore.example'
 *   - opportunities.opportunity_name starts with '[DEMO]'
 *   - estimates.estimate_number = 'DEMO-EST-001'
 *   - projects.project_number   = 'DEMO-PROJ-001'
 *   - estimate_lines via estimate_id lookup
 *
 * Usage:
 *   tsx --env-file=.env.local scripts/seed-demo-workflow.ts [--dry-run] [--org mdm-group] [--division contracting]
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
const DIVISION_CODE = flag('--division') ?? 'contracting';

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
  accountName: '[DEMO] Lakeshore Properties Inc.',
  leadExternalId: 'DEMO-LEAD-001',
  leadCompanyName: '[DEMO] Lakeshore Properties Inc.',
  contactEmail: 'demo-primary@lakeshore.example',
  contactFullName: 'Demo Primary Contact',
  opportunityName: '[DEMO] Lakeshore Condo Tower — Phase 2',
  estimateNumber: 'DEMO-EST-001',
  projectNumber: 'DEMO-PROJ-001',
  projectName: '[DEMO] Lakeshore Condo Tower — Phase 2',
};

type Ids = {
  orgId: string;
  divisionId: string;
  accountId: string;
  leadId: string;
  contactId: string;
  opportunityId: string;
  estimateId: string;
  projectId: string;
};

async function resolveOrgAndDivision(): Promise<{ orgId: string; divisionId: string }> {
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', ORG_SLUG)
    .single();
  if (orgErr || !org)
    throw new Error(`Organization slug "${ORG_SLUG}" not found: ${orgErr?.message ?? 'no row'}`);

  const { data: division, error: divErr } = await supabase
    .from('divisions')
    .select('id')
    .eq('code', DIVISION_CODE)
    .eq('org_id', org.id)
    .single();
  if (divErr || !division)
    throw new Error(
      `Division code "${DIVISION_CODE}" not found in org "${ORG_SLUG}": ${divErr?.message ?? 'no row'}`,
    );

  return { orgId: org.id as string, divisionId: division.id as string };
}

async function upsertAccount(orgId: string, divisionId: string): Promise<string> {
  if (DRY_RUN) return 'dry-run-account';
  const payload = {
    org_id: orgId,
    division_id: divisionId,
    company_code: DEMO.accountCompanyCode,
    account_name: DEMO.accountName,
    account_type: 'client',
    industry: 'Real Estate Development',
    email: 'demo@lakeshore.example',
    phone: '416-555-0100',
    source: 'seed',
    tags: ['demo'],
    metadata: { demo: true, seeded_by: 'seed-demo-workflow.ts' },
  };
  const { data: existing } = await supabase
    .from('accounts')
    .select('id')
    .eq('org_id', orgId)
    .eq('company_code', DEMO.accountCompanyCode)
    .maybeSingle();
  if (existing?.id) {
    const { data, error } = await supabase
      .from('accounts')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error || !data)
      throw new Error(`upsertAccount update failed: ${error?.message ?? 'no row'}`);
    return data.id as string;
  }
  const { data, error } = await supabase.from('accounts').insert(payload).select('id').single();
  if (error || !data) throw new Error(`upsertAccount insert failed: ${error?.message ?? 'no row'}`);
  return data.id as string;
}

async function upsertLead(orgId: string, divisionId: string): Promise<string> {
  if (DRY_RUN) return 'dry-run-lead';
  // external_id is NOT a unique key — manual upsert via lookup-then-insert/update.
  const { data: existing } = await supabase
    .from('leads')
    .select('id')
    .eq('org_id', orgId)
    .eq('external_id', DEMO.leadExternalId)
    .maybeSingle();

  const payload = {
    org_id: orgId,
    division_id: divisionId,
    external_id: DEMO.leadExternalId,
    company_name: DEMO.leadCompanyName,
    domain: 'lakeshore.example',
    industry: 'Real Estate Development',
    source_channel: 'seed',
    source_detail: 'seed-demo-workflow.ts',
    status: 'qualified' as const,
    project_type: 'commercial',
    estimated_value: 3_200_000,
    city: 'Mississauga',
    province: 'Ontario',
    is_qualified: true,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('leads')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error || !data) throw new Error(`upsertLead update failed: ${error?.message ?? 'no row'}`);
    return data.id as string;
  }
  const { data, error } = await supabase.from('leads').insert(payload).select('id').single();
  if (error || !data) throw new Error(`upsertLead insert failed: ${error?.message ?? 'no row'}`);
  return data.id as string;
}

async function upsertContact(orgId: string, leadId: string): Promise<string> {
  if (DRY_RUN) return 'dry-run-contact';
  const { data: existing } = await supabase
    .from('contacts')
    .select('id')
    .eq('org_id', orgId)
    .eq('email', DEMO.contactEmail)
    .maybeSingle();

  const payload = {
    org_id: orgId,
    lead_id: leadId,
    full_name: DEMO.contactFullName,
    first_name: 'Demo',
    last_name: 'Contact',
    email: DEMO.contactEmail,
    phone: '416-555-0101',
    title: 'VP Development',
    role: 'decision_maker',
    is_primary: true,
    is_decision_maker: true,
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('contacts')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error || !data)
      throw new Error(`upsertContact update failed: ${error?.message ?? 'no row'}`);
    return data.id as string;
  }
  const { data, error } = await supabase.from('contacts').insert(payload).select('id').single();
  if (error || !data) throw new Error(`upsertContact insert failed: ${error?.message ?? 'no row'}`);
  return data.id as string;
}

async function upsertOpportunity(
  orgId: string,
  divisionId: string,
  leadId: string,
  accountId: string,
  contactId: string,
): Promise<string> {
  if (DRY_RUN) return 'dry-run-opportunity';
  const { data: existing } = await supabase
    .from('opportunities')
    .select('id')
    .eq('org_id', orgId)
    .eq('opportunity_name', DEMO.opportunityName)
    .maybeSingle();

  const payload = {
    org_id: orgId,
    division_id: divisionId,
    lead_id: leadId,
    account_id: accountId,
    contact_id: contactId,
    opportunity_name: DEMO.opportunityName,
    stage: 'estimating' as const,
    estimated_revenue: 3_200_000,
    probability_pct: 60,
    source_channel: 'seed',
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('opportunities')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error || !data)
      throw new Error(`upsertOpportunity update failed: ${error?.message ?? 'no row'}`);
    return data.id as string;
  }
  const { data, error } = await supabase
    .from('opportunities')
    .insert(payload)
    .select('id')
    .single();
  if (error || !data)
    throw new Error(`upsertOpportunity insert failed: ${error?.message ?? 'no row'}`);
  return data.id as string;
}

async function upsertEstimate(
  orgId: string,
  divisionId: string,
  opportunityId: string,
  accountId: string,
  contactId: string,
): Promise<string> {
  if (DRY_RUN) return 'dry-run-estimate';
  const { data: existing } = await supabase
    .from('estimates')
    .select('id')
    .eq('org_id', orgId)
    .eq('estimate_number', DEMO.estimateNumber)
    .maybeSingle();

  const payload = {
    org_id: orgId,
    division_id: divisionId,
    opportunity_id: opportunityId,
    account_id: accountId,
    contact_id: contactId,
    estimate_number: DEMO.estimateNumber,
    status: 'draft' as const,
    currency_code: 'CAD',
    metadata: { demo: true, seeded_by: 'seed-demo-workflow.ts' },
  };

  const estimateId = existing?.id
    ? await (async () => {
        const { data, error } = await supabase
          .from('estimates')
          .update(payload)
          .eq('id', existing.id)
          .select('id')
          .single();
        if (error || !data)
          throw new Error(`upsertEstimate update failed: ${error?.message ?? 'no row'}`);
        return data.id as string;
      })()
    : await (async () => {
        const { data, error } = await supabase
          .from('estimates')
          .insert(payload)
          .select('id')
          .single();
        if (error || !data)
          throw new Error(`upsertEstimate insert failed: ${error?.message ?? 'no row'}`);
        return data.id as string;
      })();

  await supabase.from('estimate_lines').delete().eq('estimate_id', estimateId);

  const lines = [
    {
      description: 'Site preparation and excavation',
      quantity: 1,
      unit: 'ls',
      unit_cost: 185_000,
      markup_pct: 10,
      line_total: 203_500,
    },
    {
      description: 'Structural steel frame — 12 floors',
      quantity: 1,
      unit: 'ls',
      unit_cost: 1_450_000,
      markup_pct: 12,
      line_total: 1_624_000,
    },
    {
      description: 'MEP rough-in and finishes',
      quantity: 1,
      unit: 'ls',
      unit_cost: 780_000,
      markup_pct: 15,
      line_total: 897_000,
    },
  ];
  const { error: linesErr } = await supabase.from('estimate_lines').insert(
    lines.map((line, idx) => ({
      ...line,
      org_id: orgId,
      estimate_id: estimateId,
      line_type: 'item',
      sort_order: idx,
      metadata: { demo: true },
    })),
  );
  if (linesErr) throw new Error(`upsertEstimate lines insert failed: ${linesErr.message}`);

  const subtotal = lines.reduce((sum, l) => sum + l.line_total, 0);
  const tax = Math.round(subtotal * 0.13 * 100) / 100;
  const { error: totalsErr } = await supabase
    .from('estimates')
    .update({ subtotal_amount: subtotal, tax_amount: tax, total_amount: subtotal + tax })
    .eq('id', estimateId);
  if (totalsErr) throw new Error(`upsertEstimate totals update failed: ${totalsErr.message}`);

  return estimateId;
}

async function upsertProject(
  orgId: string,
  divisionId: string,
  accountId: string,
  contactId: string,
): Promise<string> {
  if (DRY_RUN) return 'dry-run-project';
  const { data: existing } = await supabase
    .from('projects')
    .select('id')
    .eq('org_id', orgId)
    .eq('project_number', DEMO.projectNumber)
    .maybeSingle();

  const payload = {
    org_id: orgId,
    division_id: divisionId,
    account_id: accountId,
    contact_id: contactId,
    project_number: DEMO.projectNumber,
    project_name: DEMO.projectName,
    status: 'planning' as const,
    baseline_budget: 2_724_500,
    current_budget: 2_724_500,
    site_address: {
      street: '2500 Lakeshore Rd W',
      city: 'Mississauga',
      province: 'Ontario',
      postal_code: 'L5J 1K4',
      country: 'Canada',
    },
    metadata: { demo: true, seeded_by: 'seed-demo-workflow.ts' },
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error || !data)
      throw new Error(`upsertProject update failed: ${error?.message ?? 'no row'}`);
    return data.id as string;
  }
  const { data, error } = await supabase.from('projects').insert(payload).select('id').single();
  if (error || !data) throw new Error(`upsertProject insert failed: ${error?.message ?? 'no row'}`);
  return data.id as string;
}

async function main() {
  console.log(`\n=== Demo workflow seed ===`);
  console.log(`  org:      ${ORG_SLUG}`);
  console.log(`  division: ${DIVISION_CODE}`);
  console.log(`  dry-run:  ${DRY_RUN}\n`);

  const { orgId, divisionId } = await resolveOrgAndDivision();
  console.log(`Resolved org=${orgId} division=${divisionId}`);

  if (DRY_RUN) {
    console.log('\n[dry-run] would create:');
    console.log(`  account:     ${DEMO.accountName} (company_code=${DEMO.accountCompanyCode})`);
    console.log(`  lead:        ${DEMO.leadCompanyName} (external_id=${DEMO.leadExternalId})`);
    console.log(`  contact:     ${DEMO.contactFullName} <${DEMO.contactEmail}>`);
    console.log(`  opportunity: ${DEMO.opportunityName} (stage=estimating)`);
    console.log(`  estimate:    ${DEMO.estimateNumber} with 3 line items`);
    console.log(`  project:     ${DEMO.projectNumber} / ${DEMO.projectName}`);
    return;
  }

  const accountId = await upsertAccount(orgId, divisionId);
  console.log(`  account     ${accountId}`);
  const leadId = await upsertLead(orgId, divisionId);
  console.log(`  lead        ${leadId}`);
  const contactId = await upsertContact(orgId, leadId);
  console.log(`  contact     ${contactId}`);
  const opportunityId = await upsertOpportunity(orgId, divisionId, leadId, accountId, contactId);
  console.log(`  opportunity ${opportunityId}`);
  const estimateId = await upsertEstimate(orgId, divisionId, opportunityId, accountId, contactId);
  console.log(`  estimate    ${estimateId}`);
  const projectId = await upsertProject(orgId, divisionId, accountId, contactId);
  console.log(`  project     ${projectId}`);

  const ids: Ids = {
    orgId,
    divisionId,
    accountId,
    leadId,
    contactId,
    opportunityId,
    estimateId,
    projectId,
  };
  console.log('\nDone. Walk these URLs (replace <slug> with your org slug):');
  console.log(`  /org/${ORG_SLUG}/crm/accounts/${accountId}`);
  console.log(`  /org/${ORG_SLUG}/crm/contacts/${contactId}`);
  console.log(`  /org/${ORG_SLUG}/crm/leads/${leadId}`);
  console.log(`  /org/${ORG_SLUG}/crm/opportunities/${opportunityId}`);
  console.log(`  /org/${ORG_SLUG}/estimates/${estimateId}`);
  console.log(`  /org/${ORG_SLUG}/projects/${projectId}`);
  console.log(`\nRun 'tsx --env-file=.env.local scripts/unseed-demo.ts' to remove.`);
  console.log(`\nManifest:\n${JSON.stringify(ids, null, 2)}`);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
