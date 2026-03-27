import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';

const getQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'cancelled']).optional(),
  assigned_user_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const createSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'done', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assigned_user_id: z.string().uuid().optional(),
  milestone_id: z.string().uuid().optional(),
  due_at: z.string().optional(),
  start_at: z.string().optional(),
});

export const GET = withApiRoute({ querySchema: getQuerySchema }, async ({ req }) => {
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const { project_id, status, assigned_user_id } = getQuerySchema.parse(params);

  let query = supabase
    .from('tasks')
    .select(
      'id, project_id, title, description, status, priority, assigned_user_id, created_by, milestone_id, due_at, start_at, completed_at, blocked_reason, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (project_id) query = query.eq('project_id', project_id);
  if (status) query = query.eq('status', status);
  if (assigned_user_id) query = query.eq('assigned_user_id', assigned_user_id);

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    throw dbError('Failed to fetch tasks');
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({ bodySchema: createSchema }, async ({ body }) => {
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase.from('tasks').insert(body).select().single();

  if (error) {
    throw dbError('Failed to create task');
  }

  return NextResponse.json(data, { status: 201 });
});
