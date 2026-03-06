import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { calculateAccountHealth, determineLifecycleStage } from '@/lib/crm/account-health';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const supabase = await createUserClient();

  // Verify account exists
  const { data: account, error: accError } = await supabase
    .from('accounts')
    .select('id, account_name')
    .eq('id', id)
    .single();

  if (accError) {
    const status = accError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: accError.message }, { status });
  }

  // Fetch opportunities for this account
  const { data: opportunities } = await supabase
    .from('opportunities')
    .select('id, stage, estimated_revenue')
    .eq('account_id', id);

  const opps = opportunities ?? [];
  const wonOpps = opps.filter((o) => o.stage === 'contracted');
  const activeOpps = opps.filter((o) => !['contracted', 'closed_lost'].includes(o.stage));
  const totalRevenue = wonOpps.reduce((sum, o) => sum + (o.estimated_revenue ?? 0), 0);

  // Fetch most recent activity
  const { data: recentActivity } = await supabase
    .from('activities')
    .select('created_at')
    .eq('account_id', id)
    .order('created_at', { ascending: false })
    .limit(1);

  const lastActivityAt = recentActivity?.[0]?.created_at ?? null;
  const lastWonDate = wonOpps.length > 0 ? wonOpps[0].id : null; // Placeholder

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
}
