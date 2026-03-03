import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { getOrgIdFromAuth } from '@/lib/api/org';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  status: z
    .enum(['planning', 'active', 'on_hold', 'substantial_complete', 'closed', 'cancelled'])
    .optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().nonnegative().optional(),
});

const createSchema = z.object({
  project_name: z.string().min(1).max(200),
  project_number: z.string().min(1).max(50),
  division_id: z.string().min(1),
  status: z
    .enum(['planning', 'active', 'on_hold', 'substantial_complete', 'closed', 'cancelled'])
    .optional(),
  site_address: z.record(z.string(), z.any()).nullable().optional(),
  baseline_budget: z.number().nonnegative().optional(),
  current_budget: z.number().nonnegative().optional(),
  start_date: z.string().optional(),
  target_completion_date: z.string().optional(),
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
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

  const { division_id, status, search, limit, offset } = parsed.data;
  const supabase = await createUserClient();

  let query = supabase.from('projects').select('*').order('created_at', { ascending: false });

  if (division_id) {
    query = query.eq('division_id', division_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.ilike('project_name', `%${search}%`);
  }

  if (limit) {
    query = query.limit(limit);
  }

  if (offset) {
    query = query.range(offset, offset + (limit || 20) - 1);
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

  const orgId = await getOrgIdFromAuth();
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...parsed.data, org_id: orgId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
