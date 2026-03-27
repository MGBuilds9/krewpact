import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const patchSchema = z.object({
  action: z.enum(['pause', 'resume']),
});

export const PATCH = withApiRoute({ bodySchema: patchSchema }, async ({ params, body }) => {
  const { enrollmentId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { action } = body;

  if (action === 'pause') {
    const { data, error } = await supabase
      .from('sequence_enrollments')
      .update({ status: 'paused', paused_at: new Date().toISOString() })
      .eq('id', enrollmentId)
      .eq('status', 'active')
      .select()
      .single();

    if (error) throw dbError(error.message);
    if (!data) throw notFound('Enrollment (not active)');
    return NextResponse.json(data);
  }

  // Resume
  const { data, error } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'active', paused_at: null })
    .eq('id', enrollmentId)
    .eq('status', 'paused')
    .select()
    .single();

  if (error) throw dbError(error.message);
  if (!data) throw notFound('Enrollment (not paused)');
  return NextResponse.json(data);
});
