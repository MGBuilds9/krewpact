import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { dailyLogCreateSchema } from '@/lib/validators/projects';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

type RouteContext = { params: Promise<{ id: string }> };

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { limit, offset } = parsed.data;
  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;

  const supabase = await createUserClient();
  const { data, error, count } = await supabase
    .from('project_daily_logs')
    .select('*', { count: 'exact' })
    .eq('project_id', id)
    .order('log_date', { ascending: false })
    .range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
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

  const parsed = dailyLogCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('project_daily_logs')
    .insert({ ...parsed.data, project_id: id, author_user_id: userId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
