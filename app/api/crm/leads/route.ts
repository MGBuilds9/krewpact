import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { leadCreateSchema } from '@/lib/validators/crm';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { scoreLead } from '@/lib/crm/scoring-engine';
import type { ScoringRule } from '@/lib/crm/scoring-engine';

const leadStages = [
  'new',
  'qualified',
  'estimating',
  'proposal_sent',
  'won',
  'lost',
] as const;

const querySchema = z.object({
  division_id: z.string().uuid().optional(),
  stage: z.enum(leadStages).optional(),
  assigned_to: z.string().uuid().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
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

  const { division_id, stage, assigned_to, search, limit, offset } =
    parsed.data;
  const supabase = await createUserClient();

  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (division_id) {
    query = query.eq('division_id', division_id);
  }

  if (stage) {
    query = query.eq('stage', stage);
  }

  if (assigned_to) {
    query = query.eq('assigned_to', assigned_to);
  }

  if (search) {
    query = query.ilike('lead_name', `%${search}%`);
  }

  if (limit) {
    query = query.limit(limit);
  }

  if (offset) {
    query = query.range(offset, offset + (limit ?? 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
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
    .insert({ ...parsed.data, stage: 'new' })
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
