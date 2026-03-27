import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { costCodeCreateSchema } from '@/lib/validators/procurement';

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
  is_active: z.coerce.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
  offset: z.coerce.number().int().nonnegative().default(0),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { division_id, is_active, search, limit, offset } = querySchema.parse(params);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('cost_code_dictionary')
    .select(
      'id, division_id, cost_code, cost_code_name, parent_cost_code_id, is_active, created_at, updated_at',
      { count: 'exact' },
    )
    .order('cost_code', { ascending: true })
    .range(offset, offset + limit - 1);

  if (division_id) query = query.eq('division_id', division_id);
  if (is_active !== undefined) query = query.eq('is_active', is_active);
  if (search) query = query.ilike('cost_code_name', `%${search}%`);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json(
    { data, total, hasMore: offset + limit < total },
    { headers: { 'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600' } },
  );
});

export const POST = withApiRoute({ bodySchema: costCodeCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('cost_code_dictionary')
    .insert({ ...body, is_active: true })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
