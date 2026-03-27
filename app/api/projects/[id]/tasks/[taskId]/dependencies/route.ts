import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { taskDependencyCreateSchema } from '@/lib/validators/projects';

export const GET = withApiRoute({}, async ({ params }) => {
  const { taskId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('task_dependencies')
    .select('id, task_id, depends_on_task_id, dependency_type, created_at')
    .eq('task_id', taskId);

  if (error) throw dbError(error.message);

  return NextResponse.json({ data: data || [] });
});

export const POST = withApiRoute({}, async ({ req, params }) => {
  const { taskId } = params;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = taskDependencyCreateSchema.safeParse({
    ...(rawBody as Record<string, unknown>),
    task_id: taskId,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error } = await supabase
    .from('task_dependencies')
    .insert(parsed.data)
    .select()
    .single();

  if (error) throw dbError(error.message);

  return NextResponse.json(data, { status: 201 });
});

export const DELETE = withApiRoute({}, async ({ req }) => {
  const dependencyId = req.nextUrl.searchParams.get('dependency_id');

  if (!dependencyId) {
    return NextResponse.json({ error: 'dependency_id query param required' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('task_dependencies').delete().eq('id', dependencyId);

  if (error) throw dbError(error.message);

  return NextResponse.json({ success: true });
});
