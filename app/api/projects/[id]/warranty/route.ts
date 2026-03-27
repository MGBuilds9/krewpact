import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { warrantyItemCreateSchema } from '@/lib/validators/closeout';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id: projectId } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('warranty_items')
    .select(
      'id, project_id, deficiency_id, title, provider_name, warranty_start, warranty_end, terms, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', projectId)
    .order('warranty_end', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: warrantyItemCreateSchema },
  async ({ params, body, userId }) => {
    const { id: projectId } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('warranty_items')
      .insert({ ...body, project_id: projectId, created_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
