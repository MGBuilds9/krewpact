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

  return NextResponse.json({
    division_comparison: calculateDivisionComparison(opps),
    seasonal_analysis: calculateSeasonalAnalysis(opps),
  });
}
