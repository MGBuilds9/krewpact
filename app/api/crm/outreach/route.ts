import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { outreachCreateSchema } from '@/lib/validators/crm';

const querySchema = z.object({
  lead_id: z.string().uuid(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, query }) => {
  const { lead_id } = query;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('outreach')
    .select(
      'id, channel, direction, subject, message_preview, notes, outcome, outcome_detail, activity_type, is_automated, lead_id, contact_id, sequence_id, sequence_step, created_by, occurred_at',
      { count: 'exact' },
    )
    .eq('lead_id', lead_id)
    .order('occurred_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: outreachCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('outreach').insert(body).select().single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});
