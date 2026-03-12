import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import {
  calculateRepPerformance,
  calculatePipelineAging,
  calculateWinLossAnalysis,
} from '@/lib/crm/pipeline-intelligence';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { division_id } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('opportunities')
    .select('id, stage, estimated_revenue, owner_user_id, division_id, created_at, updated_at');

  if (division_id) {
    query = query.eq('division_id', division_id);
  }

  const { data: opportunities, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const opps = opportunities ?? [];

  const repPerformance = calculateRepPerformance(opps);
  const pipelineAging = calculatePipelineAging(opps);
  const winLossByRep = calculateWinLossAnalysis(opps, (o) => o.owner_user_id ?? 'unassigned');
  const winLossByDivision = calculateWinLossAnalysis(
    opps,
    (o) => (o as unknown as { division_id: string | null }).division_id ?? 'unassigned',
  );

  // Resolve user UUIDs to names
  const userIds = repPerformance.map((r) => r.user_id).filter((id) => id !== 'unassigned');
  let userNameMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', userIds);
    userNameMap = new Map(
      (users ?? []).map((u) => [u.id, `${u.first_name} ${u.last_name}`.trim()]),
    );
  }

  const enrichedRepPerformance = repPerformance.map((r) => ({
    ...r,
    name:
      r.user_id === 'unassigned'
        ? 'Unassigned'
        : (userNameMap.get(r.user_id) ?? r.user_id.slice(0, 8)),
  }));

  // Resolve division UUIDs to names for win/loss
  const divIds = winLossByDivision.map((w) => w.dimension).filter((id) => id !== 'unassigned');
  let divNameMap = new Map<string, string>();
  if (divIds.length > 0) {
    const { data: divisions } = await supabase
      .from('divisions')
      .select('id, name')
      .in('id', divIds);
    divNameMap = new Map((divisions ?? []).map((d) => [d.id, d.name]));
  }

  const enrichedWinLossByRep = winLossByRep.map((w) => ({
    ...w,
    name:
      w.dimension === 'unassigned'
        ? 'Unassigned'
        : (userNameMap.get(w.dimension) ?? w.dimension.slice(0, 8)),
  }));

  const enrichedWinLossByDivision = winLossByDivision.map((w) => ({
    ...w,
    name:
      w.dimension === 'unassigned' ? 'Unassigned' : (divNameMap.get(w.dimension) ?? w.dimension),
  }));

  return NextResponse.json({
    rep_performance: enrichedRepPerformance,
    pipeline_aging: pipelineAging,
    win_loss_by_rep: enrichedWinLossByRep,
    win_loss_by_division: enrichedWinLossByDivision,
  });
}
