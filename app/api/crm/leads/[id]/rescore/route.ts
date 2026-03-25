import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { scoreLead } from '@/lib/crm/scoring-engine';
import { logger } from '@/lib/logger';
import { createUserClientSafe } from '@/lib/supabase/server';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/crm/leads/[id]/rescore
 * Explicit rescore endpoint — fetches lead + active rules, runs scoring engine,
 * updates the lead record, and inserts a score history entry.
 */
export async function POST(_req: NextRequest, context: RouteContext) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(_req, { limit: 30, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { id } = await context.params;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(
      'id, company_name, status, lost_reason, lead_score, fit_score, intent_score, engagement_score, source_channel, utm_campaign, source_detail, assigned_to, division_id, created_at, updated_at, city, province, address, postal_code, industry, next_followup_at, last_touch_at, is_qualified, automation_paused, current_sequence_id, domain, enrichment_status, enrichment_data, deleted_at',
    )
    .eq('id', id)
    .single();

  if (leadError) {
    const status = leadError.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: leadError.message }, { status });
  }

  const [rulesResult] = await Promise.all([
    supabase
      .from('scoring_rules')
      .select(
        'id, name, category, field_name, operator, value, score_impact, is_active, priority, division_id, created_at, updated_at',
      )
      .eq('is_active', true),
  ]);

  if (rulesResult.error) {
    return NextResponse.json({ error: rulesResult.error.message }, { status: 500 });
  }

  const result = scoreLead(lead as Record<string, unknown>, (rulesResult.data ?? []) as ScoringRule[]);
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

  if (updateError) {
    logger.error('Rescore update failed', { leadId: id, error: updateError.message });
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await supabase.from('lead_score_history').insert({
    lead_id: id,
    lead_score: result.total_score,
    fit_score: result.fit_score,
    intent_score: result.intent_score,
    engagement_score: result.engagement_score,
    triggered_by: 'manual_rescore',
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
