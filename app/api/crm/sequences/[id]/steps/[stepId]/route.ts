import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, stepId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('sequence_steps')
    .delete()
    .eq('id', stepId)
    .eq('sequence_id', id);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
