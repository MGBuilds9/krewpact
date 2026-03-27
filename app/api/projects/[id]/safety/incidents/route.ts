import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { safetyIncidentCreateSchema } from '@/lib/validators/safety';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('safety_incidents')
    .select(
      'id, project_id, incident_date, severity, summary, reported_by, closed_at, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', id)
    .order('incident_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: safetyIncidentCreateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;
    const { data, error } = await supabase
      .from('safety_incidents')
      .insert({ project_id: id, reported_by: userId, ...body })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
