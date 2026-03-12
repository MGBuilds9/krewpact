import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import {
  calculateDivisionComparison,
  calculateSeasonalAnalysis,
} from '@/lib/crm/construction-intelligence';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  const { data: opportunities, error } = await supabase
    .from('opportunities')
    .select('id, division_id, stage, estimated_revenue, created_at, updated_at');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const opps = opportunities ?? [];

  const divisionComparison = calculateDivisionComparison(opps);

  // Resolve division UUIDs to names
  const divIds = divisionComparison.map((d) => d.division_id).filter((id) => id !== 'unassigned');
  let divNameMap = new Map<string, string>();
  if (divIds.length > 0) {
    const { data: divisions } = await supabase
      .from('divisions')
      .select('id, name')
      .in('id', divIds);
    divNameMap = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  }

  const enrichedDivisions = divisionComparison.map((d) => ({
    ...d,
    name:
      d.division_id === 'unassigned'
        ? 'Unassigned'
        : (divNameMap.get(d.division_id) ?? d.division_id),
  }));

  return NextResponse.json({
    division_comparison: enrichedDivisions,
    seasonal_analysis: calculateSeasonalAnalysis(opps),
  });
}
