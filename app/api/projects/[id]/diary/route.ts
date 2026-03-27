import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { siteDiaryEntryCreateSchema } from '@/lib/validators/projects';

const querySchema = z.object({
  entry_type: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const GET = withApiRoute({ querySchema }, async ({ req, params }) => {
  const { id } = params;
  const entry_type = req.nextUrl.searchParams.get('entry_type');
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;
  let query = supabase
    .from('site_diary_entries')
    .select(
      'id, project_id, entry_at, entry_type, entry_text, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', id)
    .order('entry_at', { ascending: false });

  if (entry_type) query = query.eq('entry_type', entry_type);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: siteDiaryEntryCreateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('site_diary_entries')
      .insert({ ...body, project_id: id, created_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
