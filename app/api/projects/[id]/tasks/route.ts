import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { taskCreateSchema } from '@/lib/validators/projects';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

const TASK_COLUMNS =
  'id, project_id, title, description, status, priority, assigned_user_id, milestone_id, start_at, due_at, completed_at, blocked_reason, created_by, created_at, updated_at';

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const searchParams = req.nextUrl.searchParams;

  const supabase = await createUserClient();
  let query = supabase.from('tasks').select(TASK_COLUMNS, { count: 'exact' }).eq('project_id', id);

  const milestoneId = searchParams.get('milestone_id');
  if (milestoneId) {
    query = query.eq('milestone_id', milestoneId);
  }

  const status = searchParams.get('status');
  if (status) {
    query = query.eq('status', status);
  }

  const assignedUserId = searchParams.get('assigned_user_id');
  if (assignedUserId) {
    query = query.eq('assigned_user_id', assignedUserId);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = taskCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...parsed.data, project_id: id, created_by: userId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
