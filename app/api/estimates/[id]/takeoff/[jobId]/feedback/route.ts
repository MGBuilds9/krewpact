import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

/**
 * GET /api/estimates/:id/takeoff/:jobId/feedback — Feedback summary.
 *
 * Returns acceptance rate, correction count, and rejection count
 * for a completed takeoff job's review.
 */
export const GET = withApiRoute({}, async ({ params }) => {
  const { jobId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: feedback, error } = await supabase
    .from('takeoff_feedback')
    .select('feedback_type')
    .eq('job_id', jobId);

  if (error) {
    throw dbError(error.message);
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
});
