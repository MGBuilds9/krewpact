import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string; jobId: string }> };

/**
 * GET /api/estimates/:id/takeoff/:jobId/feedback — Feedback summary.
 *
 * Returns acceptance rate, correction count, and rejection count
 * for a completed takeoff job's review.
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { jobId } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: feedback, error } = await supabase
    .from('takeoff_feedback')
    .select('feedback_type')
    .eq('job_id', jobId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const records = feedback ?? [];
  const accepted = records.filter((r) => r.feedback_type === 'accepted').length;
  const corrected = records.filter((r) => r.feedback_type === 'corrected').length;
  const rejected = records.filter((r) => r.feedback_type === 'rejected').length;
  const missed = records.filter((r) => r.feedback_type === 'missed').length;
  const total = records.length;
  const acceptanceRate = total > 0 ? Math.round(((accepted + corrected) / total) * 100) : 0;

  return NextResponse.json({
    total,
    accepted,
    corrected,
    rejected,
    missed,
    acceptance_rate: acceptanceRate,
  });
}
