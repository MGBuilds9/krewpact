import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const querySchema = z.object({
  project_id: z.string().uuid().optional(),
  report_type: z.string().optional(),
  status: z.enum(['draft', 'submitted', 'reviewed']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const createSchema = z.object({
  report_type: z.string().min(1).max(100),
  report_date: z.string(),
  project_id: z.string().uuid().optional(),
  division_id: z.string().uuid().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
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

  const { project_id, report_type, status, limit } = parsed.data;

  try {
    const supabase = await createUserClient();
    let query = supabase
      .from('reports')
      .select('*, user:users(first_name, last_name, avatar_url), project:projects(name)')
      .order('report_date', { ascending: false });

    if (project_id) query = query.eq('project_id', project_id);
    if (report_type) query = query.eq('report_type', report_type);
    if (status) query = query.eq('status', status);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
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
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const supabase = await createUserClient();
    const { data, error } = await supabase
      .from('reports')
      .insert({ ...parsed.data, status: 'draft' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Reports POST error:', error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}
