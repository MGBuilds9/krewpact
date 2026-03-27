import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { calculateAccountHealth, determineLifecycleStage } from '@/lib/crm/account-health';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('id, account_name')
    .eq('id', id)
    .single();

  if (accError)
    throw accError.code === 'PGRST116' ? notFound('Account') : dbError(accError.message);

  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, stage, estimated_revenue, updated_at')
    .eq('account_id', id);

  const opps = opportunities ?? [];
  const wonOpps = opps.filter((o) => o.stage === 'contracted');
  const activeOpps = opps.filter((o) => !['contracted', 'closed_lost'].includes(o.stage));
  const totalRevenue = wonOpps.reduce((sum, o) => sum + (o.estimated_revenue ?? 0), 0);

  const { data: recentActivity } = await supabase
    .from('activities')
    .select('created_at')
    .eq('account_id', id)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastActivityAt = recentActivity?.[0]?.created_at ?? null;
  const lastWonDate = wonOpps.length > 0 ? wonOpps[0].updated_at : null;

  const healthInput = {
    last_activity_at: lastActivityAt,
    total_opportunities: opps.length,
    won_opportunities: wonOpps.length,
    total_revenue: totalRevenue,
    active_opportunities: activeOpps.length,
    last_won_date: lastWonDate,
  };

  const health = calculateAccountHealth(healthInput);
  const lifecycleStage = determineLifecycleStage({
    won_opportunities: wonOpps.length,
    active_opportunities: activeOpps.length,
    last_activity_at: lastActivityAt,
    total_revenue: totalRevenue,
  });

  return NextResponse.json({
    account_id: account.id,
    account_name: account.account_name,
    health,
    lifecycle_stage: lifecycleStage,
    stats: {
      total_opportunities: opps.length,
      won_opportunities: wonOpps.length,
      active_opportunities: activeOpps.length,
      total_revenue: totalRevenue,
      last_activity_at: lastActivityAt,
    },
  });
});
