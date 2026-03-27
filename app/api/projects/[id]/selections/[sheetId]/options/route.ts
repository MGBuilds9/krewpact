import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { selectionOptionSchema } from '@/lib/validators/selections';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { sheetId } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('selection_options')
    .select(
      'id, selection_sheet_id, option_group, option_name, allowance_amount, upgrade_amount, sort_order, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('selection_sheet_id', sheetId)
    .order('sort_order', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: selectionOptionSchema },
  async ({ params, body }) => {
    const { sheetId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('selection_options')
      .insert({ ...body, selection_sheet_id: sheetId })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
