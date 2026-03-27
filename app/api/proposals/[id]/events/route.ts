import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { proposalEventCreateSchema } from '@/lib/validators/contracting';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('proposal_events')
    /* excluded from list: event_payload */
    .select('id, proposal_id, event_type, actor_user_id, occurred_at', { count: 'exact' })
    .eq('proposal_id', id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: proposalEventCreateSchema },
  async ({ params, body }) => {
    const { id: proposal_id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('proposal_events')
      .insert({ ...body, proposal_id })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
