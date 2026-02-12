import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(50).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  budget: z.number().nonnegative().nullable().optional(),
  contract_value: z.number().nonnegative().nullable().optional(),
  division_id: z.string().uuid().nullable().optional(),
  manager_id: z.string().uuid().nullable().optional(),
  client_name: z.string().max(200).nullable().optional(),
  client_contact: z.string().max(200).nullable().optional(),
  client_email: z.string().email().nullable().optional(),
  client_phone: z.string().max(50).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
  postal_code: z.string().max(20).nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
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

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('projects')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createUserClient();
  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
