import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { z } from 'zod';

const querySchema = z.object({
  field: z.string().min(1),
  context: z.string().min(2), // JSON string
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = await rateLimit(req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  let context: Record<string, unknown>;
  try {
    context = JSON.parse(parsed.data.context);
  } catch {
    return NextResponse.json({ error: 'Invalid context JSON' }, { status: 400 });
  }

  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Rule-based suggestions by field
  const field = parsed.data.field;

  if (field === 'estimated_value' && context.project_type) {
    // Look up average value for similar project types
    const { data: similar } = await supabase
      .from('opportunities')
      .select('value')
      .eq('stage', 'contracted')
      .not('value', 'is', null)
      .limit(20);

    if (similar && similar.length > 0) {
      const values = similar.map((o: { value: number }) => o.value).filter(Boolean);
      const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      const formatted = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(avg);

      return NextResponse.json({
        suggestion: String(Math.round(avg)),
        explanation: `Similar projects averaged ${formatted} (based on ${values.length} won deals)`,
      });
    }
  }

  if (field === 'industry' && context.company_name) {
    // Check if we've seen this company before
    const { data: existing } = await supabase
      .from('leads')
      .select('industry')
      .ilike('company_name', `%${String(context.company_name)}%`)
      .not('industry', 'is', null)
      .limit(1);

    if (existing?.[0]?.industry) {
      return NextResponse.json({
        suggestion: existing[0].industry,
        explanation: `Previously recorded as "${existing[0].industry}"`,
      });
    }
  }

  // Estimate line item: suggest unit_cost from cost catalog
  if (field === 'unit_cost' && context.description) {
    const { data: catalogItems } = await supabase
      .from('cost_catalog_items')
      .select('item_name, base_cost, unit')
      .ilike('item_name', `%${String(context.description)}%`)
      .not('base_cost', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (catalogItems && catalogItems.length > 0) {
      const avgCost = catalogItems.reduce((sum: number, i: { base_cost: number }) => sum + i.base_cost, 0) / catalogItems.length;
      const formatted = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(avgCost);
      return NextResponse.json({
        suggestion: String(Math.round(avgCost * 100) / 100),
        explanation: `${formatted}/unit avg from ${catalogItems.length} catalog item${catalogItems.length > 1 ? 's' : ''} matching "${context.description}"`,
      });
    }
  }

  // Estimate line item: suggest markup from similar past estimate lines
  if (field === 'markup_pct' && context.item_type) {
    const { data: pastLines } = await supabase
      .from('estimate_lines')
      .select('markup_pct')
      .eq('item_type', String(context.item_type))
      .not('markup_pct', 'is', null)
      .gt('markup_pct', 0)
      .limit(50);

    if (pastLines && pastLines.length > 0) {
      const markups = pastLines.map((l: { markup_pct: number }) => l.markup_pct);
      const avg = Math.round(markups.reduce((a: number, b: number) => a + b, 0) / markups.length);
      return NextResponse.json({
        suggestion: String(avg),
        explanation: `${avg}% avg markup for ${context.item_type} items (based on ${markups.length} past lines)`,
      });
    }
  }

  return NextResponse.json({ suggestion: null });
}
