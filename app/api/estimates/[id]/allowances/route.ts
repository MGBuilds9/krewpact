import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { estimateAllowanceCreateSchema } from '@/lib/validators/estimating';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('estimate_allowances')
    .select('id, estimate_id, allowance_name, allowance_amount, notes, created_at, updated_at', {
      count: 'exact',
    })
    .eq('estimate_id', id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw dbError(error.message);
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: estimateAllowanceCreateSchema }, async ({ body, params }) => {
  const { id } = params;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('estimate_allowances')
    .insert({ ...body, estimate_id: id })
    .select()
    .single();

  if (error) {
    throw dbError(error.message);
  }

  return NextResponse.json(data, { status: 201 });
});
