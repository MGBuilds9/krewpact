import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { serviceEventCreateSchema } from '@/lib/validators/closeout';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { callId } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('service_call_events')
    .select('id, service_call_id, event_type, actor_user_id, actor_portal_id, created_at', {
      count: 'exact',
    })
    .eq('service_call_id', callId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: serviceEventCreateSchema },
  async ({ params, body, userId }) => {
    const { callId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('service_call_events')
      .insert({ ...body, service_call_id: callId, created_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
