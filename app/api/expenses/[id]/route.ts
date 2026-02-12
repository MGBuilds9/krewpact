import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  category: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  project_id: z.string().uuid().nullable().optional(),
  expense_date: z.string().optional(),
  receipt_url: z.string().nullable().optional(),
  status: z.enum(['draft', 'submitted', 'approved', 'rejected']).optional(),
  review_notes: z.string().max(1000).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const supabase = await createUserClient();
    const { data, error } = await supabase
      .from('expenses')
      .select('*, user:users(first_name, last_name, avatar_url), project:projects(name)')
      .eq('id', id)
      .single();

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Expense GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
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

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const supabase = await createUserClient();
    const { data, error } = await supabase
      .from('expenses')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      const status = error.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Expense PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const supabase = await createUserClient();
    const { error } = await supabase.from('expenses').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Expense DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
