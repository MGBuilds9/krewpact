import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { generateEstimateNumber } from '@/lib/estimating/calculations';
import { createUserClientSafe } from '@/lib/supabase/server';
import { estimateCreateSchema } from '@/lib/validators/estimating';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  status: z.string().optional(),
  opportunity_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, query: qp }) => {
  const { division_id, status, opportunity_id } = qp;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  /* excluded from list: metadata */
  let query = supabase
    .from('estimates')
    .select(
      'id, estimate_number, status, subtotal_amount, tax_amount, total_amount, margin_pct, currency_code, revision_no, account_id, contact_id, opportunity_id, division_id, owner_user_id, approved_at, approved_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (division_id) {
    query = query.eq('division_id', division_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (opportunity_id) {
    query = query.eq('opportunity_id', opportunity_id);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    throw dbError(error.message);
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: estimateCreateSchema },
  async ({ body, userId: _userId }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    // Count existing estimates to generate next number
    const { count } = await supabase.from('estimates').select('*', { count: 'exact', head: true });

    const estimate_number = generateEstimateNumber(count ?? 0);

    const { data, error } = await supabase
      .from('estimates')
      .insert({
        ...body,
        estimate_number,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      throw dbError(error.message);
    }

    return NextResponse.json(data, { status: 201 });
  },
);
