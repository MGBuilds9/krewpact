import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async ({ params }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('job_cost_snapshots')
    .select(
      'id, project_id, snapshot_date, baseline_budget, revised_budget, committed_cost, actual_cost, forecast_cost, forecast_margin_pct, payload, created_at',
    )
    .eq('id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
});
