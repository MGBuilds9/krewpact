import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const querySchema = z.object({
  project_id: z.string().uuid().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});

const createSchema = z.object({
  amount: z.number().positive(),
  category: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  project_id: z.string().uuid().optional(),
  division_id: z.string().uuid().optional(),
  expense_date: z.string(),
  receipt_url: z.string().optional(),
  currency: z.string().max(3).default('CAD'),
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

  const { project_id, status, limit } = parsed.data;

  try {
    const supabase = await createUserClient();
    let query = supabase
      .from('expenses')
      .select('*, user:users(first_name, last_name, avatar_url), project:projects(name)')
      .order('expense_date', { ascending: false });

    if (project_id) query = query.eq('project_id', project_id);
    if (status) query = query.eq('status', status);
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Expenses GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
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
      .from('expenses')
      .insert({ ...parsed.data, status: 'draft' })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Expenses POST error:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
