import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { withApiRoute } from '@/lib/api/with-api-route';
import { createUserClientSafe } from '@/lib/supabase/server';
import { taskDependencyCreateSchema } from '@/lib/validators/projects';

const deleteQuerySchema = z.object({
  dependency_id: z.string().uuid(),
});

export const GET = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('task_dependencies')
    .select('id, task_id, depends_on_task_id, dependency_type, created_at', { count: 'exact' })
    .eq('task_id', id)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) throw dbError(error.message);
  return NextResponse.json(paginatedResponse(data, count, limit, offset));
});

export const POST = withApiRoute({}, async ({ req, params }) => {
  const { id } = params;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Inject task_id from route params before schema validation
  const parsed = taskDependencyCreateSchema.safeParse({
    ...(rawBody as Record<string, unknown>),
    task_id: id,
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

export const DELETE = withApiRoute({ querySchema: deleteQuerySchema }, async ({ req, params }) => {
  const { id } = params;
  const { dependency_id } = deleteQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', dependency_id)
    .eq('task_id', id);

  if (error) throw dbError(error.message);
  return new NextResponse(null, { status: 204 });
});
