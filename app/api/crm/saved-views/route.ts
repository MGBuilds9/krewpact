import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const entityTypes = ['lead', 'contact', 'account', 'opportunity'] as const;

const savedViewCreateSchema = z.object({
  name: z.string().min(1).max(100),
  entity_type: z.enum(entityTypes),
  filters: z.record(z.string(), z.unknown()),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
  columns: z.array(z.string()).optional(),
  is_default: z.boolean().optional(),
});

const querySchema = z.object({
  entity_type: z.enum(entityTypes).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, query }) => {
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const typedQuery = query as z.infer<typeof querySchema>;
  let dbQuery = supabase
    .from('crm_saved_views')
    .select(
      'id, name, entity_type, filters, sort_by, sort_dir, columns, is_default, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('is_default', { ascending: false })
    .order('name', { ascending: true });

  if (typedQuery.entity_type) {
    dbQuery = dbQuery.eq('entity_type', typedQuery.entity_type);
  }

  dbQuery = dbQuery.range(offset, offset + limit - 1);

  const { data, error, count } = await dbQuery;

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: savedViewCreateSchema }, async ({ body }) => {
  const parsed = body as z.infer<typeof savedViewCreateSchema>;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // If is_default, unset other defaults for same entity_type
  if (parsed.is_default) {
    await supabase
      .from('crm_saved_views')
      .update({ is_default: false })
      .eq('entity_type', parsed.entity_type);
  }

  const { data, error } = await supabase.from('crm_saved_views').insert(parsed).select().single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});
