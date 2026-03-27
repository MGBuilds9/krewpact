import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const scoringRuleSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(['fit', 'intent', 'engagement']),
  field_name: z.string().min(1),
  operator: z.string().min(1),
  value: z.string().min(1),
  score_impact: z.number().int(),
  is_active: z.boolean().optional(),
});

export const GET = withApiRoute({}, async ({ req }) => {
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('scoring_rules')
    .select(
      'id, name, category, field_name, operator, value, score_impact, is_active, priority, division_id, created_at, updated_at',
      { count: 'exact' },
    )
    .order('category')
    .order('score_impact', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: scoringRuleSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('scoring_rules').insert(body).select().single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});
