import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional(),
  description: z.string().max(5000).optional(),
  status: z.string().max(50).optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  contract_value: z.number().nonnegative().optional(),
  division_id: z.string().uuid().optional(),
  manager_id: z.string().uuid().optional(),
  client_name: z.string().max(200).optional(),
  client_contact: z.string().max(200).optional(),
  client_email: z.string().email().optional(),
  client_phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { division_id, limit } = parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (division_id) {
    query = query.eq('division_id', division_id);
  }

  if (limit) {
    query = query.limit(limit);
  }

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
    .from('projects')
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
