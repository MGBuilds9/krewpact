import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { estimateCreateSchema } from '@/lib/validators/estimating';
import { generateEstimateNumber } from '@/lib/estimating/calculations';
import { parsePagination, paginatedResponse } from '@/lib/api/pagination';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  status: z.string().optional(),
  opportunity_id: z.string().uuid().optional(),
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

  const { division_id, status, opportunity_id } = parsed.data;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  /* excluded from list: metadata */
  let query = supabase
    .from('estimates')
    .select(
      'id, estimate_number, status, subtotal_amount, tax_amount, total_amount, margin_pct, currency_code, revision_no, account_id, contact_id, opportunity_id, division_id, owner_user_id, approved_at, approved_by, created_at, updated_at',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (division_id) {
    query = query.eq('division_id', division_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (opportunity_id) {
    query = query.eq('opportunity_id', opportunity_id);
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

  const parsed = estimateCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Count existing estimates to generate next number
  const { count } = await supabase.from('estimates').select('*', { count: 'exact', head: true });

  const estimate_number = generateEstimateNumber(count ?? 0);

  const { data, error } = await supabase
    .from('estimates')
    .insert({
      ...parsed.data,
      estimate_number,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
