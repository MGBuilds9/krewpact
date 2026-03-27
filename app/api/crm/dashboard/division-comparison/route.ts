import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import {
  calculateDivisionComparison,
  calculateSeasonalAnalysis,
} from '@/lib/crm/construction-intelligence';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({ rateLimit: { limit: 30, window: '1 m' } }, async () => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: opportunities, error } = await supabase
    .from('opportunities')
    .select('id, division_id, stage, estimated_revenue, created_at, updated_at');

  if (error) throw dbError(error.message);

  const opps = opportunities ?? [];

  return NextResponse.json({
    division_comparison: calculateDivisionComparison(opps),
    seasonal_analysis: calculateSeasonalAnalysis(opps),
  });
});
