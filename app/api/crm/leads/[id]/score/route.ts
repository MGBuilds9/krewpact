import { NextResponse } from 'next/server';

import { dbError, notFound } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { scoreLead } from '@/lib/crm/scoring-engine';
import { createUserClientSafe } from '@/lib/supabase/server';

const LEAD_SELECT =
  'id, company_name, status, lost_reason, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, enrichment_data, deleted_at';

export const GET = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .eq('id', id)
    .single();

  if (leadError)
    throw leadError.code === 'PGRST116' ? notFound('Lead') : dbError(leadError.message);

  const { data: rules, error: rulesError } = await supabase
    .from('scoring_rules')
    .select(
      'id, name, category, field_name, operator, value, score_impact, is_active, priority, division_id, created_at, updated_at',
    )
    .eq('is_active', true);

  if (rulesError) throw dbError(rulesError.message);

  const result = scoreLead(lead as Record<string, unknown>, (rules ?? []) as ScoringRule[]);

  const { data: history, error: historyError } = await supabase
    .from('lead_score_history')
    .select(
      'id, lead_id, lead_score, fit_score, intent_score, engagement_score, triggered_by, recorded_at',
    )
    .eq('lead_id', id)
    .order('recorded_at', { ascending: false })
    .limit(50);

  if (historyError) throw dbError(historyError.message);

  return NextResponse.json({
    score: lead.lead_score ?? 0,
    fit_score: lead.fit_score ?? 0,
    intent_score: lead.intent_score ?? 0,
    engagement_score: lead.engagement_score ?? 0,
    rule_results: result.rule_results,
    history: history ?? [],
  });
});

export const POST = withApiRoute({}, async ({ params }) => {
  const { id } = params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(LEAD_SELECT)
    .eq('id', id)
    .single();

  if (leadError)
    throw leadError.code === 'PGRST116' ? notFound('Lead') : dbError(leadError.message);

  const { data: rules, error: rulesError } = await supabase
    .from('scoring_rules')
    .select(
      'id, name, category, field_name, operator, value, score_impact, is_active, priority, division_id, created_at, updated_at',
    )
    .eq('is_active', true);

  if (rulesError) throw dbError(rulesError.message);

  const result = scoreLead(lead as Record<string, unknown>, (rules ?? []) as ScoringRule[]);
  const previousScore = lead.lead_score ?? 0;

  const { error: updateError } = await supabase
    .from('leads')
    .update({
      lead_score: result.total_score,
      fit_score: result.fit_score,
      intent_score: result.intent_score,
      engagement_score: result.engagement_score,
    })
    .eq('id', id);

  if (updateError) throw dbError(updateError.message);

  await supabase.from('lead_score_history').insert({
    lead_id: id,
    lead_score: result.total_score,
    fit_score: result.fit_score,
    intent_score: result.intent_score,
    engagement_score: result.engagement_score,
    triggered_by: 'manual',
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
});
