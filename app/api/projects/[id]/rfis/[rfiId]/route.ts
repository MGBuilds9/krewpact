import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { rfiUpdateSchema } from '@/lib/validators/field-ops';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id, rfiId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('rfi_items')
    .select(
      'id, project_id, rfi_number, title, question_text, status, due_at, requester_user_id, responder_user_id, closed_at, created_at, updated_at',
    )
    .eq('id', rfiId)
    .eq('project_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('RFI');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute({ bodySchema: rfiUpdateSchema }, async ({ params, body }) => {
  const { id, rfiId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('rfi_items')
    .update(body)
    .eq('id', rfiId)
    .eq('project_id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('RFI');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});
