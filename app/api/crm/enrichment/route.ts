import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'in_progress']).optional(),
  source: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const rawParams = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status, source, search, sort_by, sort_dir } = parsed.data;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('enrichment_jobs')
    .select('id, lead_id, status, source, result, error_message, created_at, updated_at', {
      count: 'exact',
    })
    .order(sort_by ?? 'created_at', { ascending: sort_dir === 'asc' });

  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);
  if (search) query = query.ilike('lead_id', `%${search}%`);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});
