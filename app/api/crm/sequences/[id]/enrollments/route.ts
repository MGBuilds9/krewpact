import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  status: z.string().optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, params }) => {
  const { id } = params;
  const rawParams = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(rawParams);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('sequence_enrollments')
    .select(
      'id, sequence_id, lead_id, contact_id, status, current_step, started_at, completed_at, paused_at, created_at, updated_at',
    )
    .eq('sequence_id', id)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});
