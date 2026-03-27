import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { timeEntryCreateSchema } from '@/lib/validators/time-expense';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const userFilter = req.nextUrl.searchParams.get('user_id');
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('time_entries')
    .select(
      'id, project_id, task_id, user_id, work_date, hours_regular, hours_overtime, cost_code, notes, source, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('project_id', id)
    .order('work_date', { ascending: false });

  if (userFilter) query = query.eq('user_id', userFilter);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: timeEntryCreateSchema },
  async ({ params, body }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('time_entries')
      .insert({ project_id: id, ...body })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
