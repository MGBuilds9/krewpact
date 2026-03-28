import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { biddingCreateSchema } from '@/lib/validators/crm';

const querySchema = z.object({
  status: z.string().optional(),
  source: z.string().optional(),
  division_id: z.string().optional(),
  deadline_before: z.string().optional(),
  deadline_after: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, query: qp }) => {
  const {
    status,
    source,
    division_id,
    deadline_before,
    deadline_after,
    search,
    sort_by,
    sort_dir,
  } = qp;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('bidding_opportunities')
    .select('*', { count: 'exact' })
    .order(sort_by ?? 'created_at', { ascending: sort_dir === 'asc' });

  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);
  if (division_id) query = query.eq('division_id', division_id);
  if (deadline_before) query = query.lte('deadline', deadline_before);
  if (deadline_after) query = query.gte('deadline', deadline_after);
  if (search) query = query.ilike('title', `%${search}%`);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: biddingCreateSchema, rateLimit: { limit: 30, window: '1 m' } },
  async ({ body, userId }) => {
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('bidding_opportunities')
      .insert({ ...body, created_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
