import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { getKrewpactRoles } from '@/lib/api/org';

const ALLOWED_ROLES = ['executive', 'platform_admin'];

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Role gating: executive + platform_admin only
  const userRoles = await getKrewpactRoles();
  const hasAccess = userRoles.some((r: unknown) => ALLOWED_ROLES.includes(String(r)));
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Forbidden: executive or platform_admin role required' },
      { status: 403 },
    );
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Parallel queries for KPI data
  const [opportunitiesResult, projectsResult, estimatesResult] = await Promise.all([
    supabase.from('opportunities').select('id, stage, estimated_revenue'),
    supabase.from('projects').select('id, status').eq('status', 'active'),
    supabase.from('estimates').select('id, status, total_amount'),
  ]);

  if (opportunitiesResult.error || projectsResult.error || estimatesResult.error) {
    return NextResponse.json(
      { error: 'Failed to fetch executive dashboard data' },
      { status: 500 },
    );
  }

  const opportunities = opportunitiesResult.data ?? [];
  const activeProjects = projectsResult.data ?? [];
  const estimates = estimatesResult.data ?? [];

  // Total pipeline value (sum of all opportunity estimated_revenue)
  const totalPipelineValue = opportunities.reduce(
    (sum, opp) => sum + (opp.estimated_revenue ?? 0),
    0,
  );

  // Win rate (closed_won / total opportunities * 100)
  const totalOpps = opportunities.length;
  const wonOpps = opportunities.filter((o) => o.stage === 'closed_won').length;
  const winRate = totalOpps > 0 ? Math.round((wonOpps / totalOpps) * 100 * 10) / 10 : 0;

  // Average deal size
  const avgDealSize = totalOpps > 0 ? Math.round(totalPipelineValue / totalOpps) : 0;

  // Pipeline by stage
  const stageMap: Record<string, { count: number; value: number }> = {};
  for (const opp of opportunities) {
    const stage = opp.stage ?? 'unknown';
    if (!stageMap[stage]) stageMap[stage] = { count: 0, value: 0 };
    stageMap[stage].count++;
    stageMap[stage].value += opp.estimated_revenue ?? 0;
  }
  const pipeline = Object.entries(stageMap).map(([stage, data]) => ({
    stage,
    count: data.count,
    value: data.value,
  }));

  return NextResponse.json({
    kpis: {
      totalPipelineValue,
      activeProjects: activeProjects.length,
      winRate,
      avgDealSize,
      totalEstimates: estimates.length,
    },
    pipeline,
  });
}
