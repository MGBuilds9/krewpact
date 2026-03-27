import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { referenceDataValueSchema } from '@/lib/validators/governance';

const querySchema = z.object({
  is_active: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, params }) => {
  const { setId } = params;
  const {
    is_active,
    limit = 100,
    offset = 0,
  } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams));

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('reference_data_values')
    .select(
      'id, data_set_id, value_key, value_name, sort_order, is_active, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('data_set_id', setId)
    .order('sort_order', { ascending: true })
    .range(offset, offset + limit - 1);

  if (is_active !== undefined) query = query.eq('is_active', is_active);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json({ data, total, hasMore: offset + limit < total });
});

export const POST = withApiRoute(
  { bodySchema: referenceDataValueSchema },
  async ({ params, body }) => {
    const { setId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const bodyData = body as { is_active?: boolean } & Record<string, unknown>;
    const { data, error } = await supabase
      .from('reference_data_values')
      .insert({ ...bodyData, data_set_id: setId, is_active: bodyData.is_active ?? true })
      .select()
      .single();

    if (error) throw dbError(error.message);
    return NextResponse.json(data, { status: 201 });
  },
);
