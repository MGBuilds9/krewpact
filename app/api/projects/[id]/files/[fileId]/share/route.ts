import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { fileShareCreateSchema } from '@/lib/validators/documents';

export const GET = withApiRoute({}, async ({ params }) => {
  const { fileId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('file_shares')
    .select(
      'id, file_id, shared_with_user_id, shared_with_portal_actor_id, permission_level, is_active, expires_at, shared_by, created_at',
      { count: 'exact' },
    )
    .eq('file_id', fileId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data: data ?? [], total, hasMore: false });
});

export const POST = withApiRoute(
  { bodySchema: fileShareCreateSchema },
  async ({ params, body, userId }) => {
    const { fileId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('file_shares')
      .insert({ ...body, file_id: fileId, shared_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
