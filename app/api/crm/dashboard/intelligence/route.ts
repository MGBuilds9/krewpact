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

  return NextResponse.json({
    rep_performance: repPerformance,
    pipeline_aging: pipelineAging,
    win_loss_by_rep: winLossByRep,
    win_loss_by_division: winLossByDivision,
  });
}
