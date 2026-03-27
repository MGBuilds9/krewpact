import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
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

  const { data: wonOpps } = await supabase
    .from('opportunities')
    .select('id, opportunity_name, estimated_revenue, created_at, updated_at')
    .eq('account_id', id)
    .eq('stage', 'contracted')
    .order('created_at', { ascending: false });

  const opportunities = wonOpps ?? [];
  const lifetimeValue = opportunities.reduce((sum, o) => sum + (o.estimated_revenue ?? 0), 0);

  const revenueByYear: Record<string, number> = {};
  for (const opp of opportunities) {
    const year = new Date(opp.created_at).getFullYear().toString();
    revenueByYear[year] = (revenueByYear[year] ?? 0) + (opp.estimated_revenue ?? 0);
  }

  const { count: projectCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', id);

  return NextResponse.json({
    account_id: account.id,
    account_name: account.account_name,
    lifetime_value: lifetimeValue,
    total_won_deals: opportunities.length,
    revenue_by_year: revenueByYear,
    project_count: projectCount ?? 0,
    recent_deals: opportunities.slice(0, 10).map((o) => ({
      id: o.id,
      name: o.opportunity_name,
      revenue: o.estimated_revenue,
      closed_at: o.updated_at,
    })),
  });
});
