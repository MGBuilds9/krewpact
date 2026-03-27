import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { dbError, forbidden, notFound } from '@/lib/api/errors';
import { getKrewpactUserId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { SyncService } from '@/lib/erp/sync-service';
import { logger } from '@/lib/logger';
import { createServiceClient, createUserClientSafe } from '@/lib/supabase/server';
import { wonDealSchema } from '@/lib/validators/crm';

type ServiceClient = ReturnType<typeof createServiceClient>;
type UserClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

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

async function resolveAccountId(
  serviceClient: ServiceClient,
  opp: Record<string, unknown>,
  opportunityId: string,
  wonDate: string,
): Promise<string | null> {
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

interface RecordWonParams {
  supabase: UserClient;
  opp: Record<string, unknown>;
  opportunityId: string;
  wonDate: string;
  krewpactUserId: string;
  wonNotes?: string;
}

async function recordWonActivities(p: RecordWonParams): Promise<void> {
  await p.supabase.from('opportunity_stage_history').insert({
    opportunity_id: p.opportunityId,
    from_stage: p.opp.stage as string,
    to_stage: 'contracted',
    changed_by: p.krewpactUserId,
  });
  await p.supabase.from('activities').insert({
    activity_type: 'note',
    title: 'Deal Won',
    details: p.wonNotes || `Opportunity marked as won on ${p.wonDate}`,
    opportunity_id: p.opportunityId,
    owner_user_id: p.krewpactUserId,
  });
}

export const POST = withApiRoute(
  { bodySchema: wonDealSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const parsed = body as z.infer<typeof wonDealSchema>;

    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const krewpactUserId = await getKrewpactUserId();
    if (!krewpactUserId) throw forbidden('Unauthorized');

    const { data: opportunity, error: fetchError } = await supabase
      .from('opportunities')
      .select(
        'id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at',
      )
      .eq('id', id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') throw notFound('Opportunity');
      throw dbError(fetchError.message);
    }

    const opp = opportunity as Record<string, unknown>;
    if (opp.stage !== 'contracted') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_STAGE',
            message: 'Only opportunities in contracted stage can be marked as won',
          },
        },
        { status: 400 },
      );
    }

    const wonDate = parsed.won_date || new Date().toISOString().split('T')[0];
    const updatePayload: Record<string, unknown> = { stage: 'contracted', won_at: wonDate };
    if (parsed.won_notes !== undefined) updatePayload.won_notes = parsed.won_notes;

    const { data: updated, error: updateError } = await supabase
      .from('opportunities')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();
    if (updateError) throw dbError(updateError.message);

    const serviceClient = createServiceClient();
    const accountId = await resolveAccountId(serviceClient, opp, id, wonDate);
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
  },
);
