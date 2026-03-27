import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { rfqInviteSchema } from '@/lib/validators/procurement';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { rfqId } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('rfq_invites')
    .select('id, rfq_id, portal_account_id, invited_email, invited_at, status', { count: 'exact' })
    .eq('rfq_id', rfqId)
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: rfqInviteSchema }, async ({ params, body }) => {
  const { rfqId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('rfq_invites')
    .insert({ ...body, rfq_id: rfqId, invited_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
