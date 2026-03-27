import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { costCatalogItemCreateSchema } from '@/lib/validators/estimating';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  item_type: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { division_id, item_type, search, limit, offset, sort_by, sort_dir } =
    querySchema.parse(params);
  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('cost_catalog_items')
    .select(
      'id, item_code, item_name, item_type, unit, base_cost, vendor_name, division_id, effective_from, effective_to, created_at, updated_at',
      { count: 'exact' },
    )
    .order(sort_by ?? 'item_name', { ascending: sort_dir !== 'desc' });

  if (division_id) query = query.eq('division_id', division_id);
  if (item_type) query = query.eq('item_type', item_type);
  if (search) query = query.ilike('item_name', `%${search}%`);

  const { data, error, count } = await query.range(
    effectiveOffset,
    effectiveOffset + effectiveLimit - 1,
  );

  if (error) throw dbError(error.message);

  return NextResponse.json(
    {
      data: data ?? [],
      total: count ?? 0,
      hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
    },
    { headers: { 'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600' } },
  );
});

export const POST = withApiRoute({ bodySchema: costCatalogItemCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('cost_catalog_items').insert(body).select().single();
  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});
