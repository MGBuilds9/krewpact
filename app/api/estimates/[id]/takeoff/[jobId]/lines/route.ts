import { NextResponse } from 'next/server';

import { getKrewpactUserId } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';
import { reviewDraftLinesSchema } from '@/lib/validators/takeoff';

/**
 * GET /api/estimates/:id/takeoff/:jobId/lines — Draft lines for a completed job.
 */
export const GET = withApiRoute({}, async ({ params }) => {
  const { id, jobId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: lines, error } = await supabase
    .from('takeoff_draft_lines')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to fetch takeoff draft lines', { jobId, estimateId: id, error });
    return NextResponse.json({ error: 'Failed to fetch lines' }, { status: 500 });
  }

  return NextResponse.json(lines ?? []);
});

/**
 * PATCH /api/estimates/:id/takeoff/:jobId/lines — Bulk update review_status.
 */
export const PATCH = withApiRoute({}, async ({ req, params }) => {
  const { id, jobId } = params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = reviewDraftLinesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const krewpactUserId = await getKrewpactUserId();

  const { data: updated, error } = await supabase
    .from('takeoff_draft_lines')
    .update({
      review_status: parsed.data.status,
      reviewed_by: krewpactUserId ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .in('id', parsed.data.line_ids)
    .select('id');

  if (error) {
    logger.error('Failed to bulk update draft line review status', {
      jobId,
      estimateId: id,
      error,
    });
    return NextResponse.json({ error: 'Failed to update lines' }, { status: 500 });
  }

  return NextResponse.json({ updated_count: updated?.length ?? 0 });
});
