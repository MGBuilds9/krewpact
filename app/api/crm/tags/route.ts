import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { tagCreateSchema } from '@/lib/validators/crm';

const getQuerySchema = z.object({
  division_id: z.string().uuid().optional(),
});

const deleteQuerySchema = z.object({
  id: z.string().uuid(),
});

export const GET = withApiRoute({ querySchema: getQuerySchema }, async ({ req, query }) => {
  const { division_id } = query as z.infer<typeof getQuerySchema>;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let dbQuery = supabase
    .from('tags')
    .select('id, name, color, division_id, created_at, updated_at', { count: 'exact' })
    .order('name', { ascending: true });

  if (division_id) {
    dbQuery = dbQuery.eq('division_id', division_id);
  }

  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: tagCreateSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('tags')
    .insert(body as z.infer<typeof tagCreateSchema>)
    .select()
    .single();
  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});

export const DELETE = withApiRoute({ querySchema: deleteQuerySchema }, async ({ query }) => {
  const { id } = query as z.infer<typeof deleteQuerySchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('tags').delete().eq('id', id);
  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
