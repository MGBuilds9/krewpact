import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import {
  calculatePipelineAging,
  calculateRepPerformance,
  calculateWinLossAnalysis,
} from '@/lib/crm/pipeline-intelligence';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
});

export const GET = withApiRoute(
  { rateLimit: { limit: 30, window: '1 m' }, querySchema },
  async ({ query }) => {
    const { division_id } = query as z.infer<typeof querySchema>;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    let q = supabase
      .from('opportunities')
      .select('id, stage, estimated_revenue, owner_user_id, division_id, created_at, updated_at');

    if (division_id) {
      q = q.eq('division_id', division_id);
    }

    const { data: opportunities, error } = await q;

    if (error) throw dbError(error.message);

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
  },
);
