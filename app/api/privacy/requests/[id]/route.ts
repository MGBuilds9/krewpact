import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { privacyRequestUpdateSchema } from '@/lib/validators/migration';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('privacy_requests')
    .select(
      'id, requester_email, requester_name, request_type, status, legal_basis, due_at, completed_at, handled_by, notes, created_at, updated_at',
    )
    .eq('id', id)
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data);
});

export const PATCH = withApiRoute(
  { bodySchema: privacyRequestUpdateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('privacy_requests')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data);
  },
);
