import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { scoreLead } from '@/lib/crm/scoring-engine';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/crm/leads/[id]/score
 * Returns current score + score history for a lead.
 */
export async function GET(_req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(_req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const supabase = await createUserClient();

  // Fetch lead for current score
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('lead_score, fit_score, intent_score, engagement_score')
    .eq('id', id)
    .single();

  if (leadError) {
    const status = leadError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: leadError.message }, { status });
  }

  // Fetch score history
  const { data: history, error: historyError } = await supabase
    .from('lead_score_history')
    .select('id, lead_id, score, previous_score, rule_results, created_at')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  return NextResponse.json({
    score: lead.lead_score ?? 0,
    fit_score: lead.fit_score ?? 0,
    intent_score: lead.intent_score ?? 0,
    engagement_score: lead.engagement_score ?? 0,
    history: history ?? [],
  });
}

/**
 * POST /api/crm/leads/[id]/score
 * Recalculate score for a lead. Fetches lead data and active rules,
 * runs scoring engine, updates lead record, inserts history.
 */
export async function POST(_req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const supabase = await createUserClient();

  // Fetch the lead
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(
      'id, company_name, status, substatus, lifecycle_stage, lead_score, fit_score, intent_score, engagement_score, source_channel, source_campaign, attribution_detail, assigned_to:owner_id, division_id, created_at, updated_at, city, province, address, postal_code, country, industry, company_size, revenue_range, next_followup_at, last_contacted_at, is_qualified, in_sequence, sequence_paused, domain, enrichment_status, enrichment_data, deleted_at',
    )
    .eq('id', id)
    .single();

  if (leadError) {
    const status = leadError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: leadError.message }, { status });
  }

  // Fetch active scoring rules (filtered by division if applicable)
  const { data: rules, error: rulesError } = await supabase
    .from('scoring_rules')
    .select(
      'id, name:rule_name, category, field_name, operator, value, score_impact:points, active, description, created_at, updated_at',
    )
    .eq('active', true);

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  // Run scoring engine
  const result = scoreLead(lead as Record<string, unknown>, (rules ?? []) as ScoringRule[]);

  const previousScore = lead.lead_score ?? 0;

  // Update lead with new scores
  const { error: updateError } = await supabase
    .from('leads')
    .update({
      lead_score: result.total_score,
      fit_score: result.fit_score,
      intent_score: result.intent_score,
      engagement_score: result.engagement_score,
    })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Insert score history
  await supabase.from('lead_score_history').insert({
    lead_id: id,
    score: result.total_score,
    previous_score: previousScore,
    rule_results: result.rule_results as unknown as Record<string, unknown>,
  });

  return NextResponse.json({
    score: result.total_score,
    fit_score: result.fit_score,
    intent_score: result.intent_score,
    engagement_score: result.engagement_score,
    previous_score: previousScore,
    rules_evaluated: result.rule_results.length,
    rules_matched: result.rule_results.filter((r) => r.matched).length,
  });
}
