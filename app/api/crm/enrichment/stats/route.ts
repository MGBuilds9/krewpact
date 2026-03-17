import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Fetch counts by status and total in parallel
  const [totalResult, pendingResult, completedResult, failedResult, lastRunResult] =
    await Promise.all([
      supabase.from('enrichment_jobs').select('id', { count: 'exact', head: true }),
      supabase
        .from('enrichment_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('enrichment_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase
        .from('enrichment_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'failed'),
      supabase
        .from('enrichment_jobs')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1),
    ]);

  if (totalResult.error) {
    return NextResponse.json({ error: totalResult.error.message }, { status: 500 });
  }

  const lastRunAt =
    lastRunResult.data && lastRunResult.data.length > 0
      ? (lastRunResult.data[0] as { updated_at: string }).updated_at
      : null;

  return NextResponse.json({
    total: totalResult.count ?? 0,
    pending: pendingResult.count ?? 0,
    completed: completedResult.count ?? 0,
    failed: failedResult.count ?? 0,
    lastRunAt,
  });
}
