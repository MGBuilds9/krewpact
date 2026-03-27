import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { sequenceEnrollSchema } from '@/lib/validators/crm';

export const POST = withApiRoute({ bodySchema: sequenceEnrollSchema }, async ({ params, body }) => {
  const { id: sequence_id } = params;
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
    throw dbError(stepError.message);
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
      ...body,
      sequence_id,
      status: 'active',
      next_step_at: now.toISOString(),
    })
    .select()
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});
