import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe, UserClientType } from '@/lib/supabase/server';

const bulkEnrollSchema = z.object({
  sequence_id: z.string().uuid(),
  lead_ids: z.array(z.string().uuid()).min(1).max(200),
});

export const POST = withApiRoute({ bodySchema: bulkEnrollSchema }, async ({ body, logger }) => {
  const { sequence_id, lead_ids } = body;

  const result = await createUserClientSafe();
  if (result.error) return result.error;

  return performBulkEnroll(result.client, sequence_id, lead_ids, logger);
});

async function performBulkEnroll(
  supabase: UserClientType,
  sequence_id: string,
  lead_ids: string[],
  logger: {
    error: (msg: string, meta?: Record<string, unknown>) => void;
    info: (msg: string, meta?: Record<string, unknown>) => void;
  },
): Promise<NextResponse> {
  const [seqResult, stepResult] = await Promise.all([
    supabase
      .from('sequences')
      .select('id')
      .eq('id', sequence_id)
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('sequence_steps')
      .select('step_number, delay_days, delay_hours')
      .eq('sequence_id', sequence_id)
      .order('step_number', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (seqResult.error) {
    logger.error('Bulk enroll: failed to fetch sequence', { sequence_id, error: seqResult.error });
    throw dbError(seqResult.error.message);
  }
  if (!seqResult.data) {
    return NextResponse.json({ error: 'Sequence not found or inactive' }, { status: 404 });
  }
  if (stepResult.error) {
    logger.error('Bulk enroll: failed to fetch first step', {
      sequence_id,
      error: stepResult.error,
    });
    throw dbError(stepResult.error.message);
  }

  const firstStep = stepResult.data;
  const now = new Date();
  if (firstStep) {
    const delayMs =
      ((firstStep.delay_days ?? 0) * 24 * 60 + (firstStep.delay_hours ?? 0) * 60) * 60 * 1000;
    now.setTime(now.getTime() + delayMs);
  }
  const nextStepAt = now.toISOString();
  const enrolledAt = new Date().toISOString();

  const { data: existing, error: existError } = await supabase
    .from('sequence_enrollments')
    .select('lead_id')
    .eq('sequence_id', sequence_id)
    .in('lead_id', lead_ids)
    .in('status', ['active', 'pending_review', 'paused']);

  if (existError) {
    logger.error('Bulk enroll: failed to check existing enrollments', { error: existError });
    throw dbError(existError.message);
  }

  const alreadyEnrolled = new Set(
    (existing ?? []).map((e: Record<string, unknown>) => e.lead_id as string),
  );
  const toEnroll = lead_ids.filter((id) => !alreadyEnrolled.has(id));

  if (toEnroll.length === 0) {
    return NextResponse.json({ enrolled: 0, skipped: lead_ids.length, errors: [] });
  }

  const rows = toEnroll.map((lead_id) => ({
    sequence_id,
    lead_id,
    status: 'active',
    current_step: firstStep ? firstStep.step_number : 1,
    next_step_at: nextStepAt,
    enrolled_at: enrolledAt,
  }));

  const { error: insertError } = await supabase.from('sequence_enrollments').insert(rows);
  if (insertError) {
    logger.error('Bulk enroll: insert failed', { sequence_id, error: insertError });
    throw dbError(insertError.message);
  }

  logger.info('Bulk enroll: success', {
    sequence_id,
    enrolled: toEnroll.length,
    skipped: alreadyEnrolled.size,
  });
  return NextResponse.json({
    enrolled: toEnroll.length,
    skipped: alreadyEnrolled.size,
    errors: [],
  });
}
