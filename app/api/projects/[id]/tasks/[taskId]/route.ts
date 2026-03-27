import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { taskUpdateSchema } from '@/lib/validators/projects';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id, taskId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('tasks')
    .select(
      'id, project_id, title, description, status, priority, assigned_user_id, milestone_id, start_at, due_at, completed_at, blocked_reason, metadata, created_by, created_at, updated_at',
    )
    .eq('id', taskId)
    .eq('project_id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Task');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const PATCH = withApiRoute({ bodySchema: taskUpdateSchema }, async ({ params, body }) => {
  const { id, taskId } = params;

  // Auto-set completed_at when status changes to 'done'
  const updateData = { ...body };
  if (updateData.status === 'done' && !updateData.completed_at) {
    updateData.completed_at = new Date().toISOString();
  }
  // Clear completed_at when status changes away from 'done'
  if (updateData.status && updateData.status !== 'done') {
    updateData.completed_at = null;
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('project_id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Task');
    throw dbError(error.message);
  }

  return NextResponse.json(data);
});

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, taskId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('project_id', id);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
