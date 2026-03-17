import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';

const querySchema = z.object({
  field: z.string().min(1),
  context: z.string().min(2), // JSON string
});

type SupabaseClient = Awaited<ReturnType<typeof createUserClientSafe>>['client'];

async function suggestEstimatedValue(supabase: SupabaseClient): Promise<NextResponse | null> {
  const { data: similar } = await supabase
    .from('opportunities')
    .select('value')
    .eq('stage', 'contracted')
    .not('value', 'is', null)
    .limit(20);

  if (!similar || similar.length === 0) return null;
  const values = similar.map((o: { value: number }) => o.value).filter(Boolean);
  const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
  const formatted = new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(avg);
  return NextResponse.json({
    suggestion: String(Math.round(avg)),
    explanation: `Similar projects averaged ${formatted} (based on ${values.length} won deals)`,
  });
}

async function suggestIndustry(
  supabase: SupabaseClient,
  companyName: string,
): Promise<NextResponse | null> {
  const { data: existing } = await supabase
    .from('leads')
    .select('industry')
    .ilike('company_name', `%${companyName}%`)
    .not('industry', 'is', null)
    .limit(1);

  if (!existing?.[0]?.industry) return null;
  return NextResponse.json({
    suggestion: existing[0].industry,
    explanation: `Previously recorded as "${existing[0].industry}"`,
  });
}

async function suggestUnitCost(
  supabase: SupabaseClient,
  description: string,
): Promise<NextResponse | null> {
  const { data: catalogItems } = await supabase
    .from('cost_catalog_items')
    .select('item_name, base_cost, unit')
    .ilike('item_name', `%${description}%`)
    .not('base_cost', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (!catalogItems || catalogItems.length === 0) return null;
  const avgCost =
    catalogItems.reduce((sum: number, i: { base_cost: number }) => sum + i.base_cost, 0) /
    catalogItems.length;
  const formatted = new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(
    avgCost,
  );
  return NextResponse.json({
    suggestion: String(Math.round(avgCost * 100) / 100),
    explanation: `${formatted}/unit avg from ${catalogItems.length} catalog item${catalogItems.length > 1 ? 's' : ''} matching "${description}"`,
  });
}

async function suggestMarkupPct(
  supabase: SupabaseClient,
  itemType: string,
): Promise<NextResponse | null> {
  const { data: pastLines } = await supabase
    .from('estimate_lines')
    .select('markup_pct')
    .eq('item_type', itemType)
    .not('markup_pct', 'is', null)
    .gt('markup_pct', 0)
    .limit(50);

  if (!pastLines || pastLines.length === 0) return null;
  const markups = pastLines.map((l: { markup_pct: number }) => l.markup_pct);
  const avg = Math.round(markups.reduce((a: number, b: number) => a + b, 0) / markups.length);
  return NextResponse.json({
    suggestion: String(avg),
    explanation: `${avg}% avg markup for ${itemType} items (based on ${markups.length} past lines)`,
  });
}

async function findSuggestion(
  supabase: SupabaseClient,
  field: string,
  context: Record<string, unknown>,
): Promise<NextResponse | null> {
  if (field === 'estimated_value' && context.project_type) return suggestEstimatedValue(supabase);
  if (field === 'industry' && context.company_name)
    return suggestIndustry(supabase, String(context.company_name));
  if (field === 'unit_cost' && context.description)
    return suggestUnitCost(supabase, String(context.description));
  if (field === 'markup_pct' && context.item_type)
    return suggestMarkupPct(supabase, String(context.item_type));
  return null;
}

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

  const suggestion = await findSuggestion(supabase, parsed.data.field, context);
  return suggestion ?? NextResponse.json({ suggestion: null });
}
