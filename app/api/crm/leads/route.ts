import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { leadCreateSchema } from '@/lib/validators/crm';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { scoreLead } from '@/lib/crm/scoring-engine';
import type { ScoringRule } from '@/lib/crm/scoring-engine';

const leadStatuses = [
  'new',
  'contacted',
  'qualified',
  'unqualified',
  'nurturing',
  'won',
  'lost',
  'disqualified',
] as const;

const querySchema = z.object({
  division_id: z.string().min(1).optional(),
  status: z.enum(leadStatuses).optional(),
  assigned_to: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  sort_by: z.string().optional(),
  sort_dir: z.enum(['asc', 'desc']).optional(),
});

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { division_id, status, assigned_to, search, limit, offset, sort_by, sort_dir } =
    parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order(sort_by ?? 'lead_score', { ascending: sort_dir === 'asc', nullsFirst: false });

  if (division_id) {
    query = query.eq('division_id', division_id);
  }

  if (status) {
    query = query.eq('status', status);
  }

  if (assigned_to) {
    query = query.eq('owner_id', assigned_to);
  }

  if (search) {
    query = query.ilike('company_name', `%${search}%`);
  }

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
    hasMore: (effectiveOffset + (data?.length ?? 0)) < (count ?? 0),
  });
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

  const parsed = leadCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createUserClient();
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...parsed.data, status: 'new' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Auto-score the new lead (non-blocking)
  try {
    let rulesQuery = supabase
      .from('scoring_rules')
      .select('*')
      .eq('is_active', true);

    if (data.division_id) {
      rulesQuery = rulesQuery.or(`division_id.eq.${data.division_id},division_id.is.null`);
    }

    const { data: rules } = await rulesQuery;
    if (rules && rules.length > 0) {
      const result = scoreLead(data as Record<string, unknown>, rules as ScoringRule[]);
      await supabase
        .from('leads')
        .update({ lead_score: result.total_score })
        .eq('id', data.id);

      await supabase.from('lead_score_history').insert({
        lead_id: data.id,
        score: result.total_score,
        previous_score: 0,
        rule_results: result.rule_results as unknown as Record<string, unknown>,
      });

      data.lead_score = result.total_score;
    }
  } catch (e) {
    // Scoring failure should not block lead creation
    console.error('Auto-score on create failed:', e);
  }

  return NextResponse.json(data, { status: 201 });
}
