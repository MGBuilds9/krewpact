import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { taskCreateSchema } from '@/lib/validators/projects';

const TASK_COLUMNS =
  'id, project_id, title, description, status, priority, assigned_user_id, milestone_id, start_at, due_at, completed_at, blocked_reason, created_by, created_at, updated_at';

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const searchParams = req.nextUrl.searchParams;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase.from('tasks').select(TASK_COLUMNS, { count: 'exact' }).eq('project_id', id);

  const milestoneId = searchParams.get('milestone_id');
  if (milestoneId) query = query.eq('milestone_id', milestoneId);

  const status = searchParams.get('status');
  if (status) query = query.eq('status', status);

  const assignedUserId = searchParams.get('assigned_user_id');
  if (assignedUserId) query = query.eq('assigned_user_id', assignedUserId);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute(
  { bodySchema: taskCreateSchema },
  async ({ params, body, userId }) => {
    const { id } = params;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...body, project_id: id, created_by: userId })
      .select()
      .single();

    if (error) throw dbError(error.message);

    return NextResponse.json(data, { status: 201 });
  },
);
