import { NextResponse } from 'next/server';

import { dbError, serverError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { rejectEnrollment } from '@/lib/crm/enrollment-engine';
import { createUserClientSafe } from '@/lib/supabase/server';

export const POST = withApiRoute({}, async ({ params }) => {
  const { id } = params;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const result = await rejectEnrollment(supabase, id);

  if (!result.success) {
    throw serverError(`Failed to reject enrollment: ${result.error}`);
  }

  const { data: enrollment, error: fetchError } = await supabase
    .from('sequence_enrollments')
    .select(
      'id, sequence_id, lead_id, contact_id, status, current_step, started_at, completed_at, paused_at, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (fetchError || !enrollment) {
    throw dbError(fetchError?.message ?? 'Failed to fetch updated record');
  }

  return NextResponse.json({ data: enrollment });
});
