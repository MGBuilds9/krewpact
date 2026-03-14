import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { activityCreateSchema } from '@/lib/validators/crm';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';

const activityTypes = ['call', 'email', 'meeting', 'note', 'task'] as const;

const querySchema = z.object({
  opportunity_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  account_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  activity_type: z.enum(activityTypes).optional(),
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

  const { opportunity_id, lead_id, account_id, contact_id, activity_type, sort_by, sort_dir } =
    parsed.data;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('activities')
    .select(
      'id, activity_type, title, details, due_at, completed_at, lead_id, contact_id, account_id, opportunity_id, owner_user_id, created_at, updated_at',
      { count: 'exact' },
    )
    .order(sort_by ?? 'created_at', { ascending: sort_dir === 'asc' });

  if (opportunity_id) {
    query = query.eq('opportunity_id', opportunity_id);
  }

  if (lead_id) {
    query = query.eq('lead_id', lead_id);
  }

  if (account_id) {
    query = query.eq('account_id', account_id);
  }

  if (contact_id) {
    query = query.eq('contact_id', contact_id);
  }

  if (activity_type) {
    query = query.eq('activity_type', activity_type);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
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

  const parsed = activityCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;
  const { data, error } = await supabase.from('activities').insert(parsed.data).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
