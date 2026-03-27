import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { rfiCreateSchema } from '@/lib/validators/field-ops';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const status = req.nextUrl.searchParams.get('status');
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  let query = supabase
    .from('rfi_items')
    .select(
      'id, project_id, rfi_number, title, question_text, status, due_at, requester_user_id, responder_user_id, closed_at, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: rfiCreateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('rfi_items')
      .insert({ ...body, project_id: id, requester_user_id: userId, status: 'open' })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
