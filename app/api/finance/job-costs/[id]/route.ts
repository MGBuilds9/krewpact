import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
  const { id } = await params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('job_cost_snapshots')
    .select(
      'id, project_id, snapshot_date, baseline_budget, revised_budget, committed_cost, actual_cost, forecast_cost, forecast_margin_pct, payload, created_at',
    )
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}
