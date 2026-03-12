import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe, createServiceClient } from '@/lib/supabase/server';
import { wonDealSchema } from '@/lib/validators/crm';
import { SyncService } from '@/lib/erp/sync-service';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { getKrewpactUserId } from '@/lib/api/org';
import { logger } from '@/lib/logger';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = wonDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const krewpactUserId = await getKrewpactUserId();
  if (!krewpactUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch opportunity
  const { data: opportunity, error: fetchError } = await supabase
    .from('opportunities')
    .select(
      'id, opportunity_name, stage, estimated_revenue, probability_pct, target_close_date, account_id, contact_id, lead_id, division_id, owner_user_id, notes, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: fetchError.message }, { status });
  }

  const opp = opportunity as Record<string, unknown>;

  // Only contracted opportunities can be marked as won
  if (opp.stage !== 'contracted') {
    return NextResponse.json(
      { error: 'Only opportunities in contracted stage can be marked as won' },
      { status: 400 },
    );
  }

  // Update opportunity stage to 'contracted' with won metadata
  const wonDate = parsed.data.won_date || new Date().toISOString().split('T')[0];
  const updatePayload: Record<string, unknown> = {
    stage: 'contracted',
    won_at: wonDate,
  };
  if (parsed.data.won_notes !== undefined) {
    updatePayload.won_notes = parsed.data.won_notes;
  }

  const { data: updated, error: updateError } = await supabase
    .from('opportunities')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // --- Account creation / update ---
  // Use service client for account mutations (RLS may block user on insert)
  const serviceClient = createServiceClient();
  let accountId = opp.account_id as string | null;

  if (accountId) {
    // Existing account — fetch current stats then increment
    const { data: account, error: accFetchErr } = await serviceClient
      .from('accounts')
      .select('id, total_projects, lifetime_revenue, first_project_date, last_project_date')
      .eq('id', accountId)
      .single();

    if (accFetchErr) {
      logger.error(`Won deal: failed to fetch account ${accountId}`, { error: accFetchErr.message });
    } else if (account) {
      const acc = account as Record<string, unknown>;
      const totalProjects = ((acc.total_projects as number | null) ?? 0) + 1;
      const lifetimeRevenue =
        ((acc.lifetime_revenue as number | null) ?? 0) +
        ((opp.estimated_revenue as number | null) ?? 0);
      const today = new Date().toISOString().split('T')[0];

      const accUpdate: Record<string, unknown> = {
        total_projects: totalProjects,
        lifetime_revenue: lifetimeRevenue,
        last_project_date: today,
        is_repeat_client: totalProjects >= 2,
      };
      if (!acc.first_project_date) {
        accUpdate.first_project_date = today;
      }

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
  } else if (opp.lead_id) {
    // No account — create one from the lead
    const { data: lead, error: leadFetchErr } = await serviceClient
      .from('leads')
      .select(
        'id, company_name, industry, city, province, postal_code, phone, email, website, source_channel, division_id',
      )
      .eq('id', opp.lead_id as string)
      .single();

    if (leadFetchErr) {
      logger.error(`Won deal: failed to fetch lead ${opp.lead_id}`, { error: leadFetchErr.message });
    } else if (lead) {
      const l = lead as Record<string, unknown>;
      const today = new Date().toISOString().split('T')[0];

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
            ? {
                city: l.city,
                province: l.province ?? null,
                postal_code: l.postal_code ?? null,
              }
            : null,
        })
        .select('id')
        .single();

      if (createAccErr) {
        logger.error('Won deal: failed to create account from lead', { error: createAccErr.message });
      } else if (newAccount) {
        accountId = (newAccount as Record<string, unknown>).id as string;

        // Link opportunity to new account
        await serviceClient
          .from('opportunities')
          .update({ account_id: accountId })
          .eq('id', id);
      }
    }
  }

  // --- Create client_project_history record ---
  if (accountId) {
    const { error: histErr } = await serviceClient.from('client_project_history').insert({
      account_id: accountId,
      project_name: (opp.opportunity_name as string | null) ?? 'Project',
      division_id: opp.division_id as string | null,
      estimated_revenue: (opp.estimated_revenue as number | null) ?? 0,
      start_date: wonDate,
      status: 'active',
      opportunity_id: id,
    });

    if (histErr) {
      logger.error('Won deal: failed to create client_project_history', { error: histErr.message });
    }

    // Recompute account stats via SQL function
    const { error: rpcErr } = await serviceClient.rpc('recompute_account_stats', {
      p_account_id: accountId,
    });
    if (rpcErr) {
      logger.error(`Won deal: recompute_account_stats failed for ${accountId}`, {
        error: rpcErr.message,
      });
    }
  }

  // Record stage history
  await supabase.from('opportunity_stage_history').insert({
    opportunity_id: id,
    from_stage: opp.stage as string,
    to_stage: 'contracted',
    changed_by: krewpactUserId,
  });

  // Create activity record
  await supabase.from('activities').insert({
    activity_type: 'note',
    title: 'Deal Won',
    details: parsed.data.won_notes || `Opportunity marked as won on ${wonDate}`,
    opportunity_id: id,
    owner_user_id: krewpactUserId,
  });

  // Sync to ERPNext if requested
  let syncResult = null;
  if (parsed.data.sync_to_erp) {
    try {
      const syncService = new SyncService();
      syncResult = await syncService.syncWonDeal(id, userId, wonDate);
    } catch {
      // Sync failure is non-fatal
    }
  }

  return NextResponse.json({
    ...updated,
    account_id: accountId,
    sync_result: syncResult,
  });
}
