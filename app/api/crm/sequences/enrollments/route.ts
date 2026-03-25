import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

const bulkEnrollSchema = z.object({
  sequence_id: z.string().uuid(),
  lead_ids: z.array(z.string().uuid()).min(1).max(200),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bulkEnrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sequence_id, lead_ids } = parsed.data;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Fetch sequence and its first step in parallel
  const [seqResult, stepResult] = await Promise.all([
    supabase.from('sequences').select('id').eq('id', sequence_id).eq('status', 'active').maybeSingle(),
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
    return NextResponse.json({ error: seqResult.error.message }, { status: 500 });
  }
  if (!seqResult.data) {
    return NextResponse.json({ error: 'Sequence not found or inactive' }, { status: 404 });
  }

  if (stepResult.error) {
    logger.error('Bulk enroll: failed to fetch first step', {
      sequence_id,
      error: stepResult.error,
    });
    return NextResponse.json({ error: stepResult.error.message }, { status: 500 });
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

  // Fetch already-active enrollments to skip duplicates
  const { data: existing, error: existError } = await supabase
    .from('sequence_enrollments')
    .select('lead_id')
    .eq('sequence_id', sequence_id)
    .in('lead_id', lead_ids)
    .in('status', ['active', 'pending_review', 'paused']);

  if (existError) {
    logger.error('Bulk enroll: failed to check existing enrollments', { error: existError });
    return NextResponse.json({ error: existError.message }, { status: 500 });
  }

  const alreadyEnrolled = new Set((existing ?? []).map((e) => e.lead_id as string));
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
    return NextResponse.json({ error: insertError.message }, { status: 500 });
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
