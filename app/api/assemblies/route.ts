import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { assemblyCreateSchema } from '@/lib/validators/estimating';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  is_active: z.coerce.boolean().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { division_id, is_active, search, limit, offset } = querySchema.parse(params);
  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;

  let query = supabase
    .from('assemblies')
    .select(
      'id, assembly_code, assembly_name, description, unit, division_id, is_active, version_no, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('assembly_name', { ascending: true });

  if (division_id) query = query.eq('division_id', division_id);
  if (is_active !== undefined) query = query.eq('is_active', is_active);
  if (search) query = query.ilike('assembly_name', `%${search}%`);

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

export const POST = withApiRoute({ bodySchema: assemblyCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('assemblies').insert(body).select().single();
  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});
