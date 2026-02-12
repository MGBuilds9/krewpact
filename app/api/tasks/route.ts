import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const getQuerySchema = z.object({
  project_id: z.string().uuid().optional(),
  status: z.enum(['pending', 'todo', 'in_progress', 'done', 'completed']).optional(),
  assigned_to: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const createSchema = z.object({
  project_id: z.string().uuid(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.enum(['pending', 'todo', 'in_progress', 'done', 'completed']).default('pending'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = getQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { project_id, status, assigned_to, limit } = parsed.data;

  try {
    const supabase = await createUserClient();
    let query = supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (project_id) query = query.eq('project_id', project_id);
    if (status) query = query.eq('status', status);
    if (assigned_to) query = query.eq('assigned_to', assigned_to);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Tasks GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const supabase = await createUserClient();
    const { data, error } = await supabase
      .from('tasks')
      .insert(parsed.data)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Tasks POST error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
