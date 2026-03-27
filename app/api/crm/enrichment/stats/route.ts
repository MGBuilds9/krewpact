import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const GET = withApiRoute({}, async () => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

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

  if (totalResult.error) throw dbError(totalResult.error.message);

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
});
