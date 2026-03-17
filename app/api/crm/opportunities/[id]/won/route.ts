import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { getKrewpactUserId } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { SyncService } from '@/lib/erp/sync-service';
import { logger } from '@/lib/logger';
import { createServiceClient, createUserClientSafe } from '@/lib/supabase/server';
import { wonDealSchema } from '@/lib/validators/crm';

type RouteContext = { params: Promise<{ id: string }> };
type ServiceClient = ReturnType<typeof createServiceClient>;

async function updateExistingAccount(
  serviceClient: ServiceClient,
  accountId: string,
  estimatedRevenue: number | null,
): Promise<void> {
  const { data: account, error: accFetchErr } = await serviceClient
    .from('accounts')
    .select('id, total_projects, lifetime_revenue, first_project_date, last_project_date')
    .eq('id', accountId)
    .single();

  if (accFetchErr) {
    logger.error(`Won deal: failed to fetch account ${accountId}`, { error: accFetchErr.message });
    return;
  }
  if (!account) return;

  const acc = account as Record<string, unknown>;
  const totalProjects = ((acc.total_projects as number | null) ?? 0) + 1;
  const lifetimeRevenue = ((acc.lifetime_revenue as number | null) ?? 0) + (estimatedRevenue ?? 0);
  const today = new Date().toISOString().split('T')[0];

  const accUpdate: Record<string, unknown> = {
    total_projects: totalProjects,
    lifetime_revenue: lifetimeRevenue,
    last_project_date: today,
    is_repeat_client: totalProjects >= 2,
  };
  if (!acc.first_project_date) accUpdate.first_project_date = today;

  const { error: accUpdateErr } = await serviceClient
    .from('accounts')
    .update(accUpdate)
    .eq('id', accountId);
  if (accUpdateErr) {
    logger.error(`Won deal: failed to update account ${accountId}`, {
      error: accUpdateErr.message,
    });
  }
}

interface CreateAccountParams {
  serviceClient: ServiceClient;
  leadId: string;
  opp: Record<string, unknown>;
  opportunityId: string;
  wonDate: string;
}

async function createAccountFromLead(params: CreateAccountParams): Promise<string | null> {
  const { serviceClient, leadId, opp, opportunityId, wonDate } = params;
  const { data: lead, error: leadFetchErr } = await serviceClient
    .from('leads')
    .select(
      'id, company_name, industry, city, province, postal_code, phone, email, website, source_channel, division_id',
    )
    .eq('id', leadId)
    .single();

  if (leadFetchErr) {
    logger.error(`Won deal: failed to fetch lead ${leadId}`, { error: leadFetchErr.message });
    return null;
  }
  if (!lead) return null;

  const l = lead as Record<string, unknown>;
  const today = wonDate;

  const { data: newAccount, error: createAccErr } = await serviceClient
    .from('accounts')
    .insert({
      account_name: (l.company_name as string | null) ?? 'Unknown Account',
      industry: l.industry as string | null,
      phone: l.phone as string | null,
      email: l.email as string | null,
      website: l.website as string | null,
      source: 'conversion',
      division_id: (l.division_id as string | null) ?? (opp.division_id as string | null),
      total_projects: 1,
      lifetime_revenue: (opp.estimated_revenue as number | null) ?? 0,
      first_project_date: today,
      last_project_date: today,
      is_repeat_client: false,
      address: l.city
        ? { city: l.city, province: l.province ?? null, postal_code: l.postal_code ?? null }
        : null,
    })
    .select('id')
    .single();

  if (createAccErr) {
    logger.error('Won deal: failed to create account from lead', { error: createAccErr.message });
    return null;
  }

  const newId = (newAccount as Record<string, unknown>).id as string;
  await serviceClient.from('opportunities').update({ account_id: newId }).eq('id', opportunityId);
  return newId;
}

interface FinalizeAccountParams {
  serviceClient: ServiceClient;
  accountId: string;
  opp: Record<string, unknown>;
  opportunityId: string;
  wonDate: string;
}

async function finalizeAccountRecords(params: FinalizeAccountParams): Promise<void> {
  const { serviceClient, accountId, opp, opportunityId, wonDate } = params;
  const { error: histErr } = await serviceClient.from('client_project_history').insert({
    account_id: accountId,
    project_name: (opp.opportunity_name as string | null) ?? 'Project',
    estimated_value: (opp.estimated_revenue as number | null) ?? 0,
    start_date: wonDate,
    outcome: 'completed',
    metadata: { opportunity_id: opportunityId },
  });
  if (histErr)
    logger.error('Won deal: failed to create client_project_history', { error: histErr.message });

  const { error: rpcErr } = await serviceClient.rpc('recompute_account_stats', {
    p_account_id: accountId,
  });
  if (rpcErr)
    logger.error(`Won deal: recompute_account_stats failed for ${accountId}`, {
      error: rpcErr.message,
    });
}

interface PostWonParams {
  supabase: NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;
  serviceClient: ServiceClient;
  opp: Record<string, unknown>;
  opportunityId: string;
  wonDate: string;
  userId: string;
  krewpactUserId: string;
  wonNotes?: string;
  syncToErp: boolean;
}

async function resolveAccountId(
  params: Pick<PostWonParams, 'serviceClient' | 'opp' | 'opportunityId' | 'wonDate'>,
): Promise<string | null> {
  const { serviceClient, opp, opportunityId, wonDate } = params;
  const existingId = opp.account_id as string | null;
  if (existingId) {
    await updateExistingAccount(
      serviceClient,
      existingId,
      (opp.estimated_revenue as number | null) ?? null,
    );
    return existingId;
  }
  if (opp.lead_id) {
    return createAccountFromLead({
      serviceClient,
      leadId: opp.lead_id as string,
      opp,
      opportunityId,
      wonDate,
    });
  }
  return null;
}

async function recordWonActivities(
  params: Pick<
    PostWonParams,
    'supabase' | 'opp' | 'opportunityId' | 'wonDate' | 'krewpactUserId' | 'wonNotes'
  >,
): Promise<void> {
  const { supabase, opp, opportunityId, wonDate, krewpactUserId, wonNotes } = params;
  await supabase.from('opportunity_stage_history').insert({
    opportunity_id: opportunityId,
    from_stage: opp.stage as string,
    to_stage: 'contracted',
    changed_by: krewpactUserId,
  });
  await supabase.from('activities').insert({
    activity_type: 'note',
    title: 'Deal Won',
    details: wonNotes || `Opportunity marked as won on ${wonDate}`,
    opportunity_id: opportunityId,
    owner_user_id: krewpactUserId,
  });
}

async function parseWonBody(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { error: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) };
  }
  const parsed = wonDealSchema.safeParse(body);
  if (!parsed.success)
    return { error: NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }) };
  return { parsed: parsed.data };
}

type UserClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

async function fetchAndValidateOpportunity(supabase: UserClient, id: string) {
  const { data: opportunity, error: fetchError } = await supabase
    .from('opportunities')
    .select(
      'id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500;
    return { error: NextResponse.json({ error: fetchError.message }, { status }) };
  }
  const opp = opportunity as Record<string, unknown>;
  if (opp.stage !== 'contracted') {
    return {
      error: NextResponse.json(
        { error: 'Only opportunities in contracted stage can be marked as won' },
        { status: 400 },
      ),
    };
  }
  return { opp };
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const parseResult = await parseWonBody(req);
  if (parseResult.error) return parseResult.error;
  const parsed = parseResult.parsed!;

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const fetchResult = await fetchAndValidateOpportunity(supabase, id);
  if (fetchResult.error) return fetchResult.error;
  const opp = fetchResult.opp!;

  const wonDate = parsed.won_date || new Date().toISOString().split('T')[0];
  const updatePayload: Record<string, unknown> = { stage: 'contracted', won_at: wonDate };
  if (parsed.won_notes !== undefined) updatePayload.won_notes = parsed.won_notes;

  const { data: updated, error: updateError } = await supabase
    .from('opportunities')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const serviceClient = createServiceClient();
  const accountId = await resolveAccountId({ serviceClient, opp, opportunityId: id, wonDate });
  if (accountId)
    await finalizeAccountRecords({ serviceClient, accountId, opp, opportunityId: id, wonDate });

  await recordWonActivities({
    supabase,
    opp,
    opportunityId: id,
    wonDate,
    krewpactUserId,
    wonNotes: parsed.won_notes,
  });

  let syncResult = null;
  if (parsed.sync_to_erp) {
    try {
      syncResult = await new SyncService().syncWonDeal(id, userId, wonDate);
    } catch {
      // Sync failure is non-fatal
    }
  }

  return NextResponse.json({ ...updated, account_id: accountId, sync_result: syncResult });
}
