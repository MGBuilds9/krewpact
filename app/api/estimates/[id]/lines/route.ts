import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { paginatedResponse, parsePagination } from '@/lib/api/pagination';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { calculateLineTotal } from '@/lib/estimating/calculations';
import { recalculateParentTotals } from '@/lib/estimating/totals';
import { createUserClientSafe } from '@/lib/supabase/server';
import { estimateLineCreateSchema } from '@/lib/validators/estimating';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { limit, offset } = parsePagination(req.nextUrl.searchParams);
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data, error, count } = await supabase
    .from('estimate_lines')
    /* excluded from list: metadata */
    .select(
      'id, estimate_id, line_type, description, quantity, unit, unit_cost, markup_pct, line_total, sort_order, is_optional, catalog_item_id, assembly_id, parent_line_id, created_at, updated_at',
      { count: 'exact' },
    )
    .eq('estimate_id', id)
    .order('sort_order', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(paginatedResponse(data, count, limit, offset));
}

export async function POST(req: NextRequest, context: RouteContext) {
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

  const parsed = estimateLineCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { quantity, unit_cost, markup_pct } = parsed.data;
  const line_total = calculateLineTotal(quantity, unit_cost, markup_pct ?? 0);

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  const { data, error } = await supabase
    .from('estimate_lines')
    .insert({
      ...parsed.data,
      estimate_id: id,
      line_total,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recalculateParentTotals(supabase, id);

  return NextResponse.json(data, { status: 201 });
}

const batchCreateSchema = z.array(estimateLineCreateSchema);

export async function PUT(req: NextRequest, context: RouteContext) {
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

  const parsed = batchCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  // Delete all existing lines for this estimate
  await supabase.from('estimate_lines').delete().eq('estimate_id', id);

  // Insert new lines with calculated line_totals
  const linesWithTotals = parsed.data.map((line) => ({
    ...line,
    estimate_id: id,
    line_total: calculateLineTotal(line.quantity, line.unit_cost, line.markup_pct ?? 0),
  }));

  const { data, error } = await supabase.from('estimate_lines').insert(linesWithTotals).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totals = await recalculateParentTotals(supabase, id);

  return NextResponse.json({ lines: data, totals });
}
