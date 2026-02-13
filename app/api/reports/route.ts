import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const querySchema = z.object({
  project_id: z.string().uuid().optional(),
  submitted_by: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const createSchema = z.object({
  project_id: z.string().uuid(),
  log_date: z.string(),
  work_summary: z.string().max(5000).optional(),
  crew_count: z.number().int().nonnegative().optional(),
  weather: z.record(z.string(), z.any()).optional(),
  delays: z.string().max(2000).optional(),
  safety_notes: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { project_id, submitted_by, limit } = parsed.data;

  const supabase = await createUserClient();
  let query = supabase
    .from('project_daily_logs')
    .select('*, submitted_user:users!project_daily_logs_submitted_by_fkey(first_name, last_name, avatar_url), project:projects(project_name)')
    .order('log_date', { ascending: false });

  if (project_id) query = query.eq('project_id', project_id);
  if (submitted_by) query = query.eq('submitted_by', submitted_by);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('project_daily_logs')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
