import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { changeRequestUpdateSchema } from '@/lib/validators/field-ops';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id, crId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('change_requests')
    .select(
      'id, project_id, request_number, title, description, state, requested_by, estimated_cost_impact, estimated_days_impact, created_at, updated_at',
    )
    .eq('id', crId)
    .eq('project_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Change request');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: changeRequestUpdateSchema },
  async ({ params, body }) => {
    const { id, crId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('change_requests')
      .update(body)
      .eq('id', crId)
      .eq('project_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Change request');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);
