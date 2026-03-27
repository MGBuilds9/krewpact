import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { submittalUpdateSchema } from '@/lib/validators/field-ops';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id, subId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('submittals')
    .select(
      'id, project_id, submittal_number, title, status, due_at, submitted_by, submitted_at, created_at, updated_at',
    )
    .eq('id', subId)
    .eq('project_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Submittal');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: submittalUpdateSchema },
  async ({ params, body }) => {
    const { id, subId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('submittals')
      .update(body)
      .eq('id', subId)
      .eq('project_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Submittal');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);
