import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { getKrewpactUserId } from '@/lib/api/org';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { noteCreateSchema } from '@/lib/validators/crm';

const entityTypes = ['lead', 'contact', 'account', 'opportunity'] as const;

const getQuerySchema = z.object({
  entity_type: z.enum(entityTypes),
  entity_id: z.string().uuid(),
});

export const GET = withApiRoute({ querySchema: getQuerySchema }, async ({ req, query }) => {
  const { entity_type, entity_id } = query as z.infer<typeof getQuerySchema>;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('notes')
    .select('id, entity_type, entity_id, content, is_pinned, created_by, created_at, updated_at', {
      count: 'exact',
    })
    .eq('entity_type', entity_type)
    .eq('entity_id', entity_id)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: noteCreateSchema }, async ({ body }) => {
  const krewpactUserId = await getKrewpactUserId();
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('notes')
    .insert({
      ...(body as z.infer<typeof noteCreateSchema>),
      ...(krewpactUserId ? { created_by: krewpactUserId } : {}),
    })
    .select()
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});
