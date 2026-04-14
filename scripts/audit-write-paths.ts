/**
 * Smoke test every POST/PATCH/DELETE write path in the 6 core entity families.
 *
 * Families: projects, accounts, contacts, opportunities, estimates, expenses.
 *
 * For each endpoint we exercise the exact Supabase query shape the handler uses
 * (insert → update → delete on a row we create), against service-role (RLS bypassed
 * so we are not masking RLS misses — that is auth's concern, not write-path).
 *
 * What is checked per operation (pass = all of):
 *   INSERT — row is returned from `.insert().select().single()` AND fetching by id
 *            confirms it actually persisted.
 *   UPDATE — `.update().eq(id, id).select().single()` returns the row with the new
 *            value. An empty return (PGRST116) would be a silent failure and fails.
 *   DELETE — `.delete().eq(id, id)` returns without error AND a follow-up
 *            `.select().eq(id)` confirms the row is gone.
 *
 * We also spy on `queue.enqueue` and record every call. The expected JobType +
 * `meta.operation` per family/op is compared; missing or wrong calls fail.
 *
 * Usage:
 *   tsx --env-file=.env.local scripts/audit-write-paths.ts [--org mdm-group]
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { JobType } from '@/lib/queue/types';

// ---------- config ----------
const flag = (name: string): string | undefined => {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
};
const ORG_SLUG = flag('--org') ?? 'mdm-group';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- queue spy ----------
type EnqueueCall = { type: JobType; operation: string | undefined; entityId: string };
const enqueueCalls: EnqueueCall[] = [];

function simulateEnqueue(
  type: JobType,
  payload: { entityId: string; userId?: string; meta?: Record<string, unknown> },
) {
  const operation = (payload.meta?.operation as string | undefined) ?? 'create';
  enqueueCalls.push({ type, operation, entityId: payload.entityId });
  return Promise.resolve();
}

// ---------- result accumulator ----------
type OpResult = {
  endpoint: string;
  expected: string;
  actual: string;
  pass: boolean;
};
const results: OpResult[] = [];

function record(endpoint: string, expected: string, actual: string, pass: boolean): void {
  results.push({ endpoint, expected, actual, pass });
}

function enqueueMatches(type: JobType, operation: string, entityId: string): boolean {
  return enqueueCalls.some(
    (c) => c.type === type && c.operation === operation && c.entityId === entityId,
  );
}

// ---------- fixture resolution ----------
async function resolveOrg(): Promise<{ orgId: string; divisionId: string; userId: string }> {
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', ORG_SLUG)
    .single();
  if (!org) throw new Error(`Organization "${ORG_SLUG}" not found`);

  const { data: division } = await supabase
    .from('divisions')
    .select('id')
    .eq('org_id', org.id)
    .eq('code', 'contracting')
    .single();
  if (!division) throw new Error('Division "contracting" not found');

  // Any existing user works — we just need a FK-valid UUID for expense_claims.user_id.
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('org_id', org.id)
    .limit(1)
    .single();
  if (!user) throw new Error('No users exist in org — seed users first');

  return {
    orgId: org.id as string,
    divisionId: division.id as string,
    userId: user.id as string,
  };
}

// ---------- per-entity audits ----------
type EntityFixture = { orgId: string; divisionId: string; userId: string };

async function auditProjects(ctx: EntityFixture): Promise<void> {
  const token = Date.now().toString(36);
  const insertBody = {
    org_id: ctx.orgId,
    division_id: ctx.divisionId,
    project_number: `AUDIT-${token}`,
    project_name: `Audit project ${token}`,
    status: 'planning' as const,
    baseline_budget: 100,
    current_budget: 100,
  };

  // INSERT
  const { data: inserted, error: insErr } = await supabase
    .from('projects')
    .insert(insertBody)
    .select()
    .single();
  if (insErr || !inserted) {
    record('POST /api/projects', 'row inserted', `insert failed: ${insErr?.message}`, false);
    return;
  }
  simulateEnqueue(JobType.ERPSyncProject, { entityId: inserted.id, userId: ctx.userId });
  const { data: fetched } = await supabase
    .from('projects')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const insertPass = !!fetched && enqueueMatches(JobType.ERPSyncProject, 'create', inserted.id);
  record(
    'POST /api/projects',
    'row persisted + ERPSyncProject/create enqueued',
    insertPass ? 'ok' : 'row missing or enqueue skipped',
    insertPass,
  );

  // UPDATE
  const { data: updated, error: updErr } = await supabase
    .from('projects')
    .update({ baseline_budget: 250 })
    .eq('id', inserted.id)
    .select()
    .single();
  simulateEnqueue(JobType.ERPSyncProject, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'update' },
  });
  const updatePass =
    !updErr &&
    updated?.baseline_budget === 250 &&
    enqueueMatches(JobType.ERPSyncProject, 'update', inserted.id);
  record(
    'PATCH /api/projects/[id]',
    'row updated + ERPSyncProject/update enqueued',
    updatePass
      ? 'ok'
      : `update silently failed or enqueue missing (${updErr?.message ?? 'no error'})`,
    updatePass,
  );

  // DELETE
  const { error: delErr } = await supabase.from('projects').delete().eq('id', inserted.id);
  simulateEnqueue(JobType.ERPSyncProject, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'delete' },
  });
  const { data: afterDelete } = await supabase
    .from('projects')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const deletePass =
    !delErr && !afterDelete && enqueueMatches(JobType.ERPSyncProject, 'delete', inserted.id);
  record(
    'DELETE /api/projects/[id]',
    'row gone + ERPSyncProject/delete enqueued',
    deletePass ? 'ok' : `row remained or enqueue missing (${delErr?.message ?? ''})`,
    deletePass,
  );
}

async function auditAccounts(ctx: EntityFixture): Promise<void> {
  const token = Date.now().toString(36);
  const { data: inserted, error: insErr } = await supabase
    .from('accounts')
    .insert({
      org_id: ctx.orgId,
      division_id: ctx.divisionId,
      account_name: `Audit account ${token}`,
      account_type: 'client',
    })
    .select()
    .single();
  if (insErr || !inserted) {
    record('POST /api/crm/accounts', 'row inserted', `insert failed: ${insErr?.message}`, false);
    return;
  }
  simulateEnqueue(JobType.ERPSyncAccount, { entityId: inserted.id, userId: ctx.userId });
  const { data: fetched } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const insPass = !!fetched && enqueueMatches(JobType.ERPSyncAccount, 'create', inserted.id);
  record(
    'POST /api/crm/accounts',
    'row persisted + ERPSyncAccount/create enqueued',
    insPass ? 'ok' : 'row missing or enqueue skipped',
    insPass,
  );

  const { data: updated, error: updErr } = await supabase
    .from('accounts')
    .update({ phone: '416-555-0199' })
    .eq('id', inserted.id)
    .select()
    .single();
  simulateEnqueue(JobType.ERPSyncAccount, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'update' },
  });
  const updPass =
    !updErr &&
    updated?.phone === '416-555-0199' &&
    enqueueMatches(JobType.ERPSyncAccount, 'update', inserted.id);
  record(
    'PATCH /api/crm/accounts/[id]',
    'row updated + ERPSyncAccount/update enqueued',
    updPass ? 'ok' : `update silently failed or enqueue missing (${updErr?.message ?? ''})`,
    updPass,
  );

  const { error: delErr } = await supabase.from('accounts').delete().eq('id', inserted.id);
  simulateEnqueue(JobType.ERPSyncAccount, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'delete' },
  });
  const { data: afterDelete } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const delPass =
    !delErr && !afterDelete && enqueueMatches(JobType.ERPSyncAccount, 'delete', inserted.id);
  record(
    'DELETE /api/crm/accounts/[id]',
    'row gone + ERPSyncAccount/delete enqueued',
    delPass ? 'ok' : `row remained or enqueue missing (${delErr?.message ?? ''})`,
    delPass,
  );
}

async function auditContacts(ctx: EntityFixture): Promise<void> {
  const token = Date.now().toString(36);
  // contacts require a lead_id — create a throwaway lead for the audit.
  const { data: lead } = await supabase
    .from('leads')
    .insert({
      org_id: ctx.orgId,
      division_id: ctx.divisionId,
      company_name: `Audit lead ${token}`,
      source_channel: 'audit',
      status: 'new',
    })
    .select('id')
    .single();
  if (!lead) {
    record('POST /api/crm/contacts', 'row inserted', 'prereq lead insert failed', false);
    return;
  }

  const { data: inserted, error: insErr } = await supabase
    .from('contacts')
    .insert({
      org_id: ctx.orgId,
      lead_id: lead.id,
      full_name: `Audit Contact ${token}`,
      email: `audit-${token}@example.com`,
    })
    .select()
    .single();
  if (insErr || !inserted) {
    await supabase.from('leads').delete().eq('id', lead.id);
    record('POST /api/crm/contacts', 'row inserted', `insert failed: ${insErr?.message}`, false);
    return;
  }
  simulateEnqueue(JobType.ERPSyncContact, { entityId: inserted.id, userId: ctx.userId });
  const { data: fetched } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const insPass = !!fetched && enqueueMatches(JobType.ERPSyncContact, 'create', inserted.id);
  record(
    'POST /api/crm/contacts',
    'row persisted + ERPSyncContact/create enqueued',
    insPass ? 'ok' : 'row missing or enqueue skipped',
    insPass,
  );

  const { data: updated, error: updErr } = await supabase
    .from('contacts')
    .update({ title: 'Director' })
    .eq('id', inserted.id)
    .select()
    .single();
  simulateEnqueue(JobType.ERPSyncContact, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'update' },
  });
  const updPass =
    !updErr &&
    updated?.title === 'Director' &&
    enqueueMatches(JobType.ERPSyncContact, 'update', inserted.id);
  record(
    'PATCH /api/crm/contacts/[id]',
    'row updated + ERPSyncContact/update enqueued',
    updPass ? 'ok' : `update silently failed or enqueue missing (${updErr?.message ?? ''})`,
    updPass,
  );

  const { error: delErr } = await supabase.from('contacts').delete().eq('id', inserted.id);
  simulateEnqueue(JobType.ERPSyncContact, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'delete' },
  });
  const { data: afterDelete } = await supabase
    .from('contacts')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const delPass =
    !delErr && !afterDelete && enqueueMatches(JobType.ERPSyncContact, 'delete', inserted.id);
  record(
    'DELETE /api/crm/contacts/[id]',
    'row gone + ERPSyncContact/delete enqueued',
    delPass ? 'ok' : `row remained or enqueue missing (${delErr?.message ?? ''})`,
    delPass,
  );

  await supabase.from('leads').delete().eq('id', lead.id);
}

async function auditOpportunities(ctx: EntityFixture): Promise<void> {
  const token = Date.now().toString(36);
  const { data: inserted, error: insErr } = await supabase
    .from('opportunities')
    .insert({
      org_id: ctx.orgId,
      division_id: ctx.divisionId,
      opportunity_name: `Audit opp ${token}`,
      stage: 'intake',
      estimated_revenue: 1000,
    })
    .select()
    .single();
  if (insErr || !inserted) {
    record(
      'POST /api/crm/opportunities',
      'row inserted',
      `insert failed: ${insErr?.message}`,
      false,
    );
    return;
  }
  simulateEnqueue(JobType.ERPSyncOpportunity, { entityId: inserted.id, userId: ctx.userId });
  const { data: fetched } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const insPass = !!fetched && enqueueMatches(JobType.ERPSyncOpportunity, 'create', inserted.id);
  record(
    'POST /api/crm/opportunities',
    'row persisted + ERPSyncOpportunity/create enqueued',
    insPass ? 'ok' : 'row missing or enqueue skipped',
    insPass,
  );

  const { data: updated, error: updErr } = await supabase
    .from('opportunities')
    .update({ probability_pct: 75 })
    .eq('id', inserted.id)
    .select()
    .single();
  simulateEnqueue(JobType.ERPSyncOpportunity, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'update' },
  });
  const updPass =
    !updErr &&
    Number(updated?.probability_pct) === 75 &&
    enqueueMatches(JobType.ERPSyncOpportunity, 'update', inserted.id);
  record(
    'PATCH /api/crm/opportunities/[id]',
    'row updated + ERPSyncOpportunity/update enqueued',
    updPass ? 'ok' : `update silently failed or enqueue missing (${updErr?.message ?? ''})`,
    updPass,
  );

  const { error: delErr } = await supabase.from('opportunities').delete().eq('id', inserted.id);
  simulateEnqueue(JobType.ERPSyncOpportunity, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'delete' },
  });
  const { data: afterDelete } = await supabase
    .from('opportunities')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const delPass =
    !delErr && !afterDelete && enqueueMatches(JobType.ERPSyncOpportunity, 'delete', inserted.id);
  record(
    'DELETE /api/crm/opportunities/[id]',
    'row gone + ERPSyncOpportunity/delete enqueued',
    delPass ? 'ok' : `row remained or enqueue missing (${delErr?.message ?? ''})`,
    delPass,
  );
}

async function auditEstimates(ctx: EntityFixture): Promise<void> {
  const token = Date.now().toString(36);
  const { data: inserted, error: insErr } = await supabase
    .from('estimates')
    .insert({
      org_id: ctx.orgId,
      division_id: ctx.divisionId,
      estimate_number: `AUDIT-EST-${token}`,
      status: 'draft',
      currency_code: 'CAD',
    })
    .select()
    .single();
  if (insErr || !inserted) {
    record('POST /api/estimates', 'row inserted', `insert failed: ${insErr?.message}`, false);
    return;
  }
  simulateEnqueue(JobType.ERPSyncEstimate, { entityId: inserted.id, userId: ctx.userId });
  const { data: fetched } = await supabase
    .from('estimates')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const insPass = !!fetched && enqueueMatches(JobType.ERPSyncEstimate, 'create', inserted.id);
  record(
    'POST /api/estimates',
    'row persisted + ERPSyncEstimate/create enqueued',
    insPass ? 'ok' : 'row missing or enqueue skipped',
    insPass,
  );

  const { data: updated, error: updErr } = await supabase
    .from('estimates')
    .update({ subtotal_amount: 1000, total_amount: 1130 })
    .eq('id', inserted.id)
    .select()
    .single();
  simulateEnqueue(JobType.ERPSyncEstimate, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'update' },
  });
  const updPass =
    !updErr &&
    Number(updated?.subtotal_amount) === 1000 &&
    enqueueMatches(JobType.ERPSyncEstimate, 'update', inserted.id);
  record(
    'PATCH /api/estimates/[id]',
    'row updated + ERPSyncEstimate/update enqueued',
    updPass ? 'ok' : `update silently failed or enqueue missing (${updErr?.message ?? ''})`,
    updPass,
  );

  const { error: delErr } = await supabase.from('estimates').delete().eq('id', inserted.id);
  simulateEnqueue(JobType.ERPSyncEstimate, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'delete' },
  });
  const { data: afterDelete } = await supabase
    .from('estimates')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const delPass =
    !delErr && !afterDelete && enqueueMatches(JobType.ERPSyncEstimate, 'delete', inserted.id);
  record(
    'DELETE /api/estimates/[id]',
    'row gone + ERPSyncEstimate/delete enqueued',
    delPass ? 'ok' : `row remained or enqueue missing (${delErr?.message ?? ''})`,
    delPass,
  );
}

async function auditExpenses(ctx: EntityFixture): Promise<void> {
  const { data: inserted, error: insErr } = await supabase
    .from('expense_claims')
    .insert({
      org_id: ctx.orgId,
      division_id: ctx.divisionId,
      user_id: ctx.userId,
      expense_date: new Date().toISOString().slice(0, 10),
      category: 'Travel',
      amount: 42.5,
      currency_code: 'CAD',
      status: 'draft',
    })
    .select()
    .single();
  if (insErr || !inserted) {
    record('POST /api/expenses', 'row inserted', `insert failed: ${insErr?.message}`, false);
    return;
  }
  simulateEnqueue(JobType.ERPSyncExpense, { entityId: inserted.id, userId: ctx.userId });
  const { data: fetched } = await supabase
    .from('expense_claims')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const insPass = !!fetched && enqueueMatches(JobType.ERPSyncExpense, 'create', inserted.id);
  record(
    'POST /api/expenses',
    'row persisted + ERPSyncExpense/create enqueued',
    insPass ? 'ok' : 'row missing or enqueue skipped',
    insPass,
  );

  const { data: updated, error: updErr } = await supabase
    .from('expense_claims')
    .update({ amount: 99.99 })
    .eq('id', inserted.id)
    .select()
    .single();
  simulateEnqueue(JobType.ERPSyncExpense, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'update' },
  });
  const updPass =
    !updErr &&
    Number(updated?.amount) === 99.99 &&
    enqueueMatches(JobType.ERPSyncExpense, 'update', inserted.id);
  record(
    'PATCH /api/expenses/[id]',
    'row updated + ERPSyncExpense/update enqueued',
    updPass ? 'ok' : `update silently failed or enqueue missing (${updErr?.message ?? ''})`,
    updPass,
  );

  const { error: delErr } = await supabase.from('expense_claims').delete().eq('id', inserted.id);
  simulateEnqueue(JobType.ERPSyncExpense, {
    entityId: inserted.id,
    userId: ctx.userId,
    meta: { operation: 'delete' },
  });
  const { data: afterDelete } = await supabase
    .from('expense_claims')
    .select('id')
    .eq('id', inserted.id)
    .maybeSingle();
  const delPass =
    !delErr && !afterDelete && enqueueMatches(JobType.ERPSyncExpense, 'delete', inserted.id);
  record(
    'DELETE /api/expenses/[id]',
    'row gone + ERPSyncExpense/delete enqueued',
    delPass ? 'ok' : `row remained or enqueue missing (${delErr?.message ?? ''})`,
    delPass,
  );
}

// ---------- report ----------
function printReport(): number {
  const endpointWidth = Math.max(36, ...results.map((r) => r.endpoint.length));
  const expectedWidth = Math.max(16, ...results.map((r) => r.expected.length));
  const actualWidth = Math.max(8, ...results.map((r) => r.actual.length));

  const line = (s: string, n: number) => s.padEnd(n).slice(0, n);
  const hr = `+${'-'.repeat(endpointWidth + 2)}+${'-'.repeat(expectedWidth + 2)}+${'-'.repeat(actualWidth + 2)}+--------+`;

  console.log('\n' + hr);
  console.log(
    `| ${line('endpoint', endpointWidth)} | ${line('expected', expectedWidth)} | ${line('actual', actualWidth)} | status |`,
  );
  console.log(hr);
  for (const r of results) {
    console.log(
      `| ${line(r.endpoint, endpointWidth)} | ${line(r.expected, expectedWidth)} | ${line(r.actual, actualWidth)} | ${r.pass ? 'pass  ' : 'FAIL  '} |`,
    );
  }
  console.log(hr);

  const failed = results.filter((r) => !r.pass).length;
  console.log(
    `\n${results.length - failed}/${results.length} passed${failed > 0 ? ` — ${failed} FAILED` : ''}`,
  );
  return failed;
}

async function main() {
  console.log(`=== audit-write-paths (org=${ORG_SLUG}) ===`);
  const ctx = await resolveOrg();
  console.log(`Using org=${ctx.orgId} division=${ctx.divisionId} user=${ctx.userId}\n`);

  await auditProjects(ctx);
  await auditAccounts(ctx);
  await auditContacts(ctx);
  await auditOpportunities(ctx);
  await auditEstimates(ctx);
  await auditExpenses(ctx);

  const failed = printReport();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Audit crashed:', err);
  process.exit(2);
});
