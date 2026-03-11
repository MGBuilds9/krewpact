import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { sequenceEnrollSchema } from '@/lib/validators/crm';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id: sequence_id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = sequenceEnrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Fetch the first step to calculate next_step_at
  const { data: firstStep, error: stepError } = await supabase
    .from('sequence_steps')
    .select('delay_days, delay_hours')
    .eq('sequence_id', sequence_id)
    .order('step_number', { ascending: true })
    .limit(1)
    .single();

  if (stepError && stepError.code !== 'PGRST116') {
    return NextResponse.json({ error: stepError.message }, { status: 500 });
  }

  const now = new Date();
  if (firstStep) {
    const delayMs =
      ((firstStep.delay_days ?? 0) * 24 * 60 + (firstStep.delay_hours ?? 0) * 60) * 60 * 1000;
    now.setTime(now.getTime() + delayMs);
  }

  const { data, error } = await supabase
    .from('sequence_enrollments')
    .insert({
      ...parsed.data,
      sequence_id,
      status: 'active',
      next_step_at: now.toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
