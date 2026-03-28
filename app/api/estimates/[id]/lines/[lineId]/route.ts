import { NextResponse } from 'next/server';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { calculateLineTotal } from '@/lib/estimating/calculations';
import { recalculateParentTotals } from '@/lib/estimating/totals';
import { createUserClient, createUserClientSafe } from '@/lib/supabase/server';
import { estimateLineUpdateSchema } from '@/lib/validators/estimating';

type SupabaseClient = Awaited<ReturnType<typeof createUserClient>>;

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

export const PATCH = withApiRoute({ bodySchema: estimateLineUpdateSchema }, async ({ body, params }) => {
  const { id, lineId } = params;

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const updateData: Record<string, unknown> = { ...body };

  const needsRecalc =
    body.quantity !== undefined ||
    body.unit_cost !== undefined ||
    body.markup_pct !== undefined;
  if (needsRecalc) {
    const { lineTotal, error } = await resolveLineTotal(supabase, lineId, body);
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
});

export const DELETE = withApiRoute({}, async ({ params }) => {
  const { id, lineId } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { error } = await supabase.from('estimate_lines').delete().eq('id', lineId);
  if (error) throw dbError(error.message);

  await recalculateParentTotals(supabase, id);
  return NextResponse.json({ success: true });
});
