import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { calculateEstimateTotals, calculateLineTotal } from '@/lib/estimating/calculations';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';
import { estimateLineUpdateSchema } from '@/lib/validators/estimating';

type RouteContext = { params: Promise<{ id: string; lineId: string }> };
type SupabaseClient = Awaited<ReturnType<typeof createUserClient>>;

async function recalculateParentTotals(supabase: SupabaseClient, estimateId: string) {
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

async function resolveLineTotal(
  supabase: SupabaseClient,
  lineId: string,
  patchData: { quantity?: number; unit_cost?: number; markup_pct?: number },
): Promise<{ lineTotal: number; error?: NextResponse }> {
  const { data: currentLine, error: fetchError } = await supabase
    .from('estimate_lines')
    .select('quantity, unit_cost, markup_pct')
    .eq('id', lineId)
    .single();

  if (fetchError) {
    const status = fetchError.code === 'PGRST116' ? 404 : 500;
    return { lineTotal: 0, error: NextResponse.json({ error: fetchError.message }, { status }) };
  }

  const current = currentLine as Record<string, number>;
  const qty = patchData.quantity ?? current.quantity;
  const cost = patchData.unit_cost ?? current.unit_cost;
  const markup = patchData.markup_pct ?? current.markup_pct;
  return { lineTotal: calculateLineTotal(qty, cost, markup) };
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const updateData: Record<string, unknown> = { ...parsed.data };

  const needsRecalc =
    parsed.data.quantity !== undefined ||
    parsed.data.unit_cost !== undefined ||
    parsed.data.markup_pct !== undefined;
  if (needsRecalc) {
    const { lineTotal, error } = await resolveLineTotal(supabase, lineId, parsed.data);
    if (error) return error;
    updateData.line_total = lineTotal;
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
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, lineId } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('estimate_lines').delete().eq('id', lineId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recalculateParentTotals(supabase, id);
  return NextResponse.json({ success: true });
}
