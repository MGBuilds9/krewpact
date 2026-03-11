import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { proposalCreateSchema } from '@/lib/validators/contracting';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const querySchema = z.object({
  estimate_id: z.string().uuid().optional(),
  status: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
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

  const { estimate_id, status, limit, offset } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  let query = supabase
    .from('proposals')
    /* excluded from list: proposal_payload */
    .select(
      'id, proposal_number, status, estimate_id, sent_at, accepted_at, rejected_at, expires_on, created_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (estimate_id) query = query.eq('estimate_id', estimate_id);
  if (status) query = query.eq('status', status);

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

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = proposalCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  const { count: existingCount, error: countError } = await supabase
    .from('proposals')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const proposal_number = `PROP-${String((existingCount ?? 0) + 1).padStart(5, '0')}`;

  const { data, error } = await supabase
    .from('proposals')
    .insert({ ...parsed.data, proposal_number })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
