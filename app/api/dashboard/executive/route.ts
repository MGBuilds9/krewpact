import { NextResponse } from 'next/server';

import { dbError, forbidden } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const ALLOWED_ROLES = ['executive', 'platform_admin'];

type OppRow = { id: string; stage: string | null; estimated_revenue: number | null };

function computeKPIs(opportunities: OppRow[]) {
  const totalPipelineValue = opportunities.reduce(
    (sum, opp) => sum + (opp.estimated_revenue ?? 0),
    0,
  );
  const totalOpps = opportunities.length;
  const wonOpps = opportunities.filter((o) => o.stage === 'closed_won').length;
  const winRate = totalOpps > 0 ? Math.round((wonOpps / totalOpps) * 100 * 10) / 10 : 0;
  const avgDealSize = totalOpps > 0 ? Math.round(totalPipelineValue / totalOpps) : 0;
  return { totalPipelineValue, totalOpps, winRate, avgDealSize };
}

function buildPipeline(opportunities: OppRow[]) {
  const stageMap: Record<string, { count: number; value: number }> = {};
  for (const opp of opportunities) {
    const stage = opp.stage ?? 'unknown';
    if (!stageMap[stage]) stageMap[stage] = { count: 0, value: 0 };
    stageMap[stage].count++;
    stageMap[stage].value += opp.estimated_revenue ?? 0;
  }
  return Object.entries(stageMap).map(([stage, data]) => ({
    stage,
    count: data.count,
    value: data.value,
  }));
}

export const GET = withApiRoute({ rateLimit: { limit: 30, window: '1 m' } }, async () => {
  const userRoles = await getKrewpactRoles();
  const hasAccess = userRoles.some((r: unknown) => ALLOWED_ROLES.includes(String(r)));
  if (!hasAccess) throw forbidden('executive or platform_admin role required');

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const [opportunitiesResult, projectsResult, estimatesResult] = await Promise.all([
    supabase.from('opportunities').select('id, stage, estimated_revenue'),
    supabase.from('projects').select('id, status').eq('status', 'active'),
    supabase.from('estimates').select('id, status, total_amount'),
  ]);

  if (opportunitiesResult.error || projectsResult.error || estimatesResult.error) {
    throw dbError('Failed to fetch executive dashboard data');
  }

  const opportunities = opportunitiesResult.data ?? [];
  const { totalPipelineValue, winRate, avgDealSize } = computeKPIs(opportunities);

  return NextResponse.json({
    kpis: {
      totalPipelineValue,
      activeProjects: (projectsResult.data ?? []).length,
      winRate,
      avgDealSize,
      totalEstimates: (estimatesResult.data ?? []).length,
    },
    pipeline: buildPipeline(opportunities),
  });
});
