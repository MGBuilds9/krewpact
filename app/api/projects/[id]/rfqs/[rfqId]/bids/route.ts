import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { rfqBidCreateSchema } from '@/lib/validators/procurement';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { rfqId } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error, count } = await supabase
    .from('rfq_bids')
    .select(
      'id, rfq_id, invite_id, submitted_by_portal_id, submitted_at, currency_code, subtotal_amount, tax_amount, total_amount, exclusions, status, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('rfq_id', rfqId)
    .order('total_amount', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: rfqBidCreateSchema }, async ({ params, body }) => {
  const { rfqId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  const { data, error } = await supabase
    .from('rfq_bids')
    .insert({ ...body, rfq_id: rfqId, submitted_at: new Date().toISOString() })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
