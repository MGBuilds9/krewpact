import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { estimateLineCreateSchema } from '@/lib/validators/estimating';
import { calculateLineTotal, calculateEstimateTotals } from '@/lib/estimating/calculations';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Fetch all lines for an estimate, recalculate totals, and update the parent estimate.
 */
async function recalculateParentTotals(
  supabase: Awaited<ReturnType<typeof createUserClient>>,
  estimateId: string,
) {
  const { data: allLines } = await supabase
    .from('estimate_lines')
    .select('line_total, is_optional')
    .eq('estimate_id', estimateId);

  const rawLines = Array.isArray(allLines) ? allLines : allLines ? [allLines] : [];
  const lines = rawLines.map((l: Record<string, unknown>) => ({
    line_total: Number(l.line_total),
    is_optional: Boolean(l.is_optional),
  }));

  const totals = calculateEstimateTotals(lines);

  await supabase
    .from('estimates')
    .update({
      subtotal_amount: totals.subtotal_amount,
      tax_amount: totals.tax_amount,
      total_amount: totals.total_amount,
    })
    .eq('id', estimateId);

  return totals;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createUserClient();

  const { data, error } = await supabase
    .from('estimate_lines')
    .select('*')
    .eq('estimate_id', id)
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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

  const supabase = await createUserClient();

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

  const supabase = await createUserClient();

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
