import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { changeOrderCreateSchema } from '@/lib/validators/field-ops';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  let query = supabase
    .from('change_orders')
    .select(
      'id, project_id, change_request_id, co_number, status, reason, amount_delta, days_delta, approved_at, approved_by, signed_contract_id, created_at, updated_at',
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
  { bodySchema: changeOrderCreateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('change_orders')
      .insert({ ...body, project_id: id, status: 'draft' })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
