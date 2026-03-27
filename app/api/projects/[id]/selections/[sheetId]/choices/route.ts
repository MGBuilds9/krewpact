import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { selectionChoiceSchema } from '@/lib/validators/selections';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { sheetId } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('selection_choices')
    .select(
      'id, selection_sheet_id, selection_option_id, chosen_by_user_id, chosen_at, quantity, notes',
      { count: 'exact' },
    )
    .eq('selection_sheet_id', sheetId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: selectionChoiceSchema },
  async ({ params, body, userId }) => {
    const { sheetId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('selection_choices')
      .upsert(
        {
          ...body,
          selection_sheet_id: sheetId,
          chosen_by: userId,
          chosen_at: new Date().toISOString(),
        },
        { onConflict: 'selection_sheet_id,selection_option_id' },
      )
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
