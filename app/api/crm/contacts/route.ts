import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { contactCreateSchema } from '@/lib/validators/crm';
import { getOrgIdFromAuth } from '@/lib/api/org';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const querySchema = z.object({
  account_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { account_id, lead_id, search, limit, offset, sort_by, sort_dir } = parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .order(sort_by ?? 'created_at', { ascending: sort_dir === 'asc' });

  if (account_id) {
    query = query.eq('account_id', account_id);
  }

  if (lead_id) {
    query = query.eq('lead_id', lead_id);
  }

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  const effectiveLimit = limit ?? 25;
  const effectiveOffset = offset ?? 0;
  query = query.range(effectiveOffset, effectiveOffset + effectiveLimit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data ?? [],
    total: count ?? 0,
    hasMore: effectiveOffset + (data?.length ?? 0) < (count ?? 0),
  });
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

  const parsed = contactCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const orgId = await getOrgIdFromAuth();
  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('contacts')
    .insert({ ...parsed.data, org_id: orgId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
