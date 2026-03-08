import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { taskDependencyCreateSchema } from '@/lib/validators/projects';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string; taskId: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { taskId } = await context.params;
  const supabase = await createUserClient();

  const { data, error } = await supabase
    .from('task_dependencies')
    .select('*')
    .eq('task_id', taskId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { taskId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = taskDependencyCreateSchema.safeParse({
    ...(body as Record<string, unknown>),
    task_id: taskId,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('task_dependencies')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await context.params;
  const dependencyId = req.nextUrl.searchParams.get('dependency_id');

  if (!dependencyId) {
    return NextResponse.json({ error: 'dependency_id query param required' }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { error } = await supabase.from('task_dependencies').delete().eq('id', dependencyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
