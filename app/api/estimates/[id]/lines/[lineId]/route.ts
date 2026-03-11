import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe, createUserClient } from '@/lib/supabase/server';
import { estimateLineUpdateSchema } from '@/lib/validators/estimating';
import { calculateLineTotal, calculateEstimateTotals } from '@/lib/estimating/calculations';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string; lineId: string }> };

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

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id, lineId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = estimateLineUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();

  if (authError) return authError;

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (
    parsed.data.quantity !== undefined ||
    parsed.data.unit_cost !== undefined ||
    parsed.data.markup_pct !== undefined
  ) {
    // Fetch current line to get existing values for fields not being updated
    const { data: currentLine, error: fetchError } = await supabase
      .from('estimate_lines')
      .select('quantity, unit_cost, markup_pct')
      .eq('id', lineId)
      .single();

    if (fetchError) {
      const status = fetchError.code === 'PGRST116' ? 404 : 500;
      return NextResponse.json({ error: fetchError.message }, { status });
    }

    const current = currentLine as Record<string, number>;
    const qty = parsed.data.quantity ?? current.quantity;
    const cost = parsed.data.unit_cost ?? current.unit_cost;
    const markup = parsed.data.markup_pct ?? current.markup_pct;

    updateData.line_total = calculateLineTotal(qty, cost, markup);
  }

  const { data, error } = await supabase
    .from('estimate_lines')
    .update(updateData)
    .eq('id', lineId)
    .select()
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  await recalculateParentTotals(supabase, id);

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, lineId } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('estimate_lines').delete().eq('id', lineId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recalculateParentTotals(supabase, id);

  return NextResponse.json({ success: true });
}
