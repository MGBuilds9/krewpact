import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { rfiThreadCreateSchema } from '@/lib/validators/field-ops';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { rfiId } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('rfi_threads')
    .select('id, rfi_id, author_user_id, message_text, is_official_response, created_at', {
      count: 'exact',
    })
    .eq('rfi_id', rfiId)
    .order('created_at')
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: rfiThreadCreateSchema },
  async ({ params, body, userId }) => {
    const { rfiId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('rfi_threads')
      .insert({ ...body, rfi_id: rfiId, author_user_id: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);

    // Auto-update RFI status to 'responded' when official response posted
    if (body.is_official_response) {
      await supabase
        .from('rfi_items')
        .update({ status: 'responded' })
        .eq('id', rfiId)
        .eq('status', 'open');
    }

    return NextResponse.json(data, { status: 201 });
  },
);
