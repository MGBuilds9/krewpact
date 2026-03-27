import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { changeOrderUpdateSchema } from '@/lib/validators/field-ops';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id, coId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('change_orders')
    .select(
      'id, project_id, change_request_id, co_number, status, reason, amount_delta, days_delta, approved_at, approved_by, signed_contract_id, created_at, updated_at',
    )
    .eq('id', coId)
    .eq('project_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Change order');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: changeOrderUpdateSchema },
  async ({ params, body }) => {
    const { id, coId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('change_orders')
      .update(body)
      .eq('id', coId)
      .eq('project_id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw notFound('Change order');
      throw dbError(error.message);
    }

    return NextResponse.json(data);
  },
);
