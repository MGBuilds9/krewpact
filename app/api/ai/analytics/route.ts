import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

type InsightRow = { insight_type: string; dismissed_at: string | null; acted_on_at: string | null };

function buildTypeCounts(
  insights: InsightRow[],
): Record<string, { total: number; dismissed: number; acted_on: number }> {
  const typeCounts: Record<string, { total: number; dismissed: number; acted_on: number }> = {};
  insights.forEach((row) => {
    const t = row.insight_type;
    if (!typeCounts[t]) typeCounts[t] = { total: 0, dismissed: 0, acted_on: 0 };
    typeCounts[t].total++;
    if (row.dismissed_at) typeCounts[t].dismissed++;
    if (row.acted_on_at) typeCounts[t].acted_on++;
  });
  return typeCounts;
}

export const GET = withApiRoute({ rateLimit: { limit: 30, window: '1 m' } }, async () => {
  const { client, error } = await createUserClientSafe();
  if (error || !client) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const [totalRes, dismissedRes, actedRes, allInsightsRes, costRes] = await Promise.all([
    client.from('ai_insights').select('id', { count: 'exact', head: true }),
    client
      .from('ai_insights')
      .select('id', { count: 'exact', head: true })
      .not('dismissed_at', 'is', null),
    client
      .from('ai_insights')
      .select('id', { count: 'exact', head: true })
      .not('acted_on_at', 'is', null),
    client.from('ai_insights').select('insight_type, dismissed_at, acted_on_at').limit(5000),
    client.from('ai_actions').select('cost_cents').limit(5000),
  ]);

  const totalGenerated = totalRes.count ?? 0;
  const totalDismissed = dismissedRes.count ?? 0;
  const totalActedOn = actedRes.count ?? 0;
  const typeCounts = buildTypeCounts((allInsightsRes.data ?? []) as InsightRow[]);
  const totalCostCents = (costRes.data ?? []).reduce(
    (sum: number, a: { cost_cents: number | null }) => sum + (a.cost_cents ?? 0),
    0,
  );

  return NextResponse.json({
    analytics: {
      total_generated: totalGenerated,
      total_dismissed: totalDismissed,
      total_acted_on: totalActedOn,
      dismiss_rate: totalGenerated ? Math.round((totalDismissed / totalGenerated) * 100) : 0,
      action_rate: totalGenerated ? Math.round((totalActedOn / totalGenerated) * 100) : 0,
      by_type: typeCounts,
      total_ai_cost_cents: totalCostCents,
    },
  });
});
