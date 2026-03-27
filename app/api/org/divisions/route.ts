import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { divisionSetupCreateSchema } from '@/lib/validators/org';

const querySchema = z.object({
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ query }) => {
  const {
    search,
    limit = 50,
    offset = 0,
  } = query as {
    search?: string;
    limit?: number;
    offset?: number;
  };
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  let dbQuery = supabase
    .from('divisions')
    .select('id, name, code, description, is_active, created_at, updated_at', { count: 'exact' })
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1);

  if (search) dbQuery = dbQuery.ilike('name', `%${search}%`);

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  const total = count ?? 0;
  return NextResponse.json(
    { data, total, hasMore: offset + limit < total },
    { headers: { 'Cache-Control': 'private, s-maxage=300, stale-while-revalidate=600' } },
  );
});

export const POST = withApiRoute({ bodySchema: divisionSetupCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

  const { data, error } = await supabase
    .from('divisions')
    .insert({ ...body, is_active: true })
    .select()
    .single();

  if (error) throw dbError(error.message);
  return NextResponse.json(data, { status: 201 });
});
