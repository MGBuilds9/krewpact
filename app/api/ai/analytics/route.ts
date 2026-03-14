import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client, error } = await createUserClientSafe();
  if (error || !client) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { count: totalGenerated } = await client
    .from('ai_insights')
    .select('id', { count: 'exact', head: true });

  const { count: totalDismissed } = await client
    .from('ai_insights')
    .select('id', { count: 'exact', head: true })
    .not('dismissed_at', 'is', null);

  const { count: totalActedOn } = await client
    .from('ai_insights')
    .select('id', { count: 'exact', head: true })
    .not('acted_on_at', 'is', null);

  const { data: allInsights } = await client
    .from('ai_insights')
    .select('insight_type, dismissed_at, acted_on_at')
    .limit(5000);

  const typeCounts: Record<string, { total: number; dismissed: number; acted_on: number }> = {};
  if (allInsights) {
    for (const i of allInsights) {
      const t = (i as { insight_type: string; dismissed_at: string | null; acted_on_at: string | null }).insight_type;
      const row = i as { insight_type: string; dismissed_at: string | null; acted_on_at: string | null };
      if (!typeCounts[t]) typeCounts[t] = { total: 0, dismissed: 0, acted_on: 0 };
      typeCounts[t].total++;
      if (row.dismissed_at) typeCounts[t].dismissed++;
      if (row.acted_on_at) typeCounts[t].acted_on++;
    }
  }

  const { data: costData } = await client
    .from('ai_actions')
    .select('cost_cents')
    .limit(5000);

  const totalCostCents = (costData ?? []).reduce(
    (sum: number, a: { cost_cents: number | null }) => sum + (a.cost_cents ?? 0),
    0
  );

  return NextResponse.json({
    analytics: {
      total_generated: totalGenerated ?? 0,
      total_dismissed: totalDismissed ?? 0,
      total_acted_on: totalActedOn ?? 0,
      dismiss_rate: totalGenerated ? Math.round(((totalDismissed ?? 0) / totalGenerated) * 100) : 0,
      action_rate: totalGenerated ? Math.round(((totalActedOn ?? 0) / totalGenerated) * 100) : 0,
      by_type: typeCounts,
      total_ai_cost_cents: totalCostCents,
    },
  });
}
