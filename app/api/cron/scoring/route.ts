import { NextRequest, NextResponse } from 'next/server';

import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createCronLogger } from '@/lib/api/cron-logger';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { scoreLead } from '@/lib/crm/scoring-engine';
import { deepResearchLead } from '@/lib/integrations/deep-research';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

const BATCH_SIZE = 50;

type ServiceClient = ReturnType<typeof createServiceClient>;

interface ScoreHistoryEntry {
  lead_id: string;
  lead_score: number;
  fit_score: number;
  intent_score: number;
  engagement_score: number;
  triggered_by: string;
}

async function fetchLeadsForScoring(supabase: ServiceClient, force: boolean) {
  let query = supabase
    .from('leads')
    .select(
      'id, company_name, domain, enrichment_status, enrichment_data, lead_score, fit_score, intent_score, engagement_score, source_channel, industry, city, province, postal_code, status, division_id, created_at, updated_at',
    )
    .eq('enrichment_status', 'complete')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (!force) query = query.or('lead_score.is.null,lead_score.eq.0');
  return query;
}

async function fetchActiveRules(supabase: ServiceClient) {
  return supabase
    .from('scoring_rules')
    .select(
      'id, name, category, field_name, operator, value, score_impact, is_active, priority, division_id, created_at, updated_at',
    )
    .eq('is_active', true);
}

async function scoreOneLead(
  supabase: ServiceClient,
  lead: Record<string, unknown>,
  rules: ScoringRule[],
  scoreHistoryBatch: ScoreHistoryEntry[],
): Promise<'success' | 'error'> {
  try {
    const result = scoreLead(lead, rules);
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        lead_score: result.total_score,
        fit_score: result.fit_score,
        intent_score: result.intent_score,
        engagement_score: result.engagement_score,
      })
      .eq('id', lead.id as string);

    if (updateError) {
      logger.error(`Score update error for ${lead.id}:`, { error: updateError.message });
      return 'error';
    }

    scoreHistoryBatch.push({
      lead_id: lead.id as string,
      lead_score: result.total_score,
      fit_score: result.fit_score,
      intent_score: result.intent_score,
      engagement_score: result.engagement_score,
      triggered_by: 'cron',
    });
    await maybeDeepResearch(supabase, lead, result.total_score);
    return 'success';
  } catch (err) {
    logger.error(`Scoring error for ${lead.id}:`, { error: err });
    return 'error';
  }
}

async function maybeDeepResearch(
  supabase: ServiceClient,
  lead: Record<string, unknown>,
  totalScore: number,
): Promise<void> {
  const enrichmentData = lead.enrichment_data as Record<string, unknown> | null;
  if (totalScore < 80 || !enrichmentData || enrichmentData.deep_research) return;
  try {
    const brave = enrichmentData.brave as Record<string, unknown> | undefined;
    const website = (brave?.website as string) ?? (lead.domain as string | null);
    const research = await deepResearchLead(
      (lead.company_name as string) ?? '',
      website,
      enrichmentData,
    );
    await supabase
      .from('leads')
      .update({ enrichment_data: { ...enrichmentData, deep_research: research } })
      .eq('id', lead.id as string);
  } catch (researchErr) {
    logger.error(`Deep research error for ${lead.id}:`, { error: researchErr });
    // Non-critical — scoring still succeeds
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cronLog = createCronLogger('scoring');
  const supabase = createServiceClient();

  const force = req.nextUrl.searchParams.get('force') === 'true';

  const { data: leads, error: leadsError } = await fetchLeadsForScoring(supabase, force);
  if (leadsError) return NextResponse.json({ error: leadsError.message }, { status: 500 });
  if (!leads || leads.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No leads to score' });
  }

  const { data: rules, error: rulesError } = await fetchActiveRules(supabase);
  if (rulesError) return NextResponse.json({ error: rulesError.message }, { status: 500 });
  if (!rules || rules.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No active scoring rules' });
  }

  let processed = 0;
  let errors = 0;
  const scoreHistoryBatch: ScoreHistoryEntry[] = [];

  for (const lead of leads) {
    const outcome = await scoreOneLead(
      supabase,
      lead as Record<string, unknown>,
      rules as ScoringRule[],
      scoreHistoryBatch,
    );
    if (outcome === 'success') processed++;
    else errors++;
  }

  if (scoreHistoryBatch.length > 0) {
    const { error: historyError } = await supabase
      .from('lead_score_history')
      .insert(scoreHistoryBatch);
    if (historyError)
      logger.error('Batch score history insert error:', { error: historyError.message });
  }

  const result = {
    success: true,
    processed,
    errors,
    total: leads.length,
    rules_count: rules.length,
    timestamp: new Date().toISOString(),
  };

  if (errors > 0 && processed === 0) {
    await cronLog.failure(new Error(`All ${errors} leads failed to score`));
  } else {
    await cronLog.success({ processed, errors, total: leads.length });
  }

  return NextResponse.json(result);
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
