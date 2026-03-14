import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';
import { scoreLead } from '@/lib/crm/scoring-engine';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { deepResearchLead } from '@/lib/integrations/deep-research';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createCronLogger } from '@/lib/api/cron-logger';

const BATCH_SIZE = 50;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cronLog = createCronLogger('scoring');
  const supabase = createServiceClient();

  // Support ?force=true to re-score all leads (not just unscored)
  const force = req.nextUrl.searchParams.get('force') === 'true';

  // Fetch enriched leads that haven't been scored yet (or all if force)
  let leadsQuery = supabase
    .from('leads')
    .select(
      'id, company_name, domain, enrichment_status, enrichment_data, lead_score, fit_score, intent_score, engagement_score, source_channel, industry, city, province, postal_code, status, division_id, created_at, updated_at',
    )
    .eq('enrichment_status', 'complete')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (!force) {
    leadsQuery = leadsQuery.or('lead_score.is.null,lead_score.eq.0');
  }

  const { data: leads, error: leadsError } = await leadsQuery;

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No leads to score' });
  }

  // Fetch all active scoring rules
  const { data: rules, error: rulesError } = await supabase
    .from('scoring_rules')
    .select(
      'id, name, category, field_name, operator, value, score_impact, is_active, priority, division_id, created_at, updated_at',
    )
    .eq('is_active', true);

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  if (!rules || rules.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No active scoring rules' });
  }

  let processed = 0;
  let errors = 0;
  const scoreHistoryBatch: Array<{
    lead_id: string;
    lead_score: number;
    fit_score: number;
    intent_score: number;
    engagement_score: number;
    triggered_by: string;
  }> = [];

  for (const lead of leads) {
    try {
      const result = scoreLead(lead as Record<string, unknown>, rules as ScoringRule[]);

      // Update lead scores (individual — each lead has different values)
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          lead_score: result.total_score,
          fit_score: result.fit_score,
          intent_score: result.intent_score,
          engagement_score: result.engagement_score,
        })
        .eq('id', lead.id);

      if (updateError) {
        errors++;
        logger.error(`Score update error for ${lead.id}:`, { error: updateError.message });
        continue;
      }

      // Collect score history for batch insert
      scoreHistoryBatch.push({
        lead_id: lead.id,
        lead_score: result.total_score,
        fit_score: result.fit_score,
        intent_score: result.intent_score,
        engagement_score: result.engagement_score,
        triggered_by: 'cron',
      });

      // Auto deep research for high-scored leads (80+)
      const enrichmentData = lead.enrichment_data as Record<string, unknown> | null;
      if (result.total_score >= 80 && enrichmentData && !enrichmentData.deep_research) {
        try {
          const brave = enrichmentData.brave as Record<string, unknown> | undefined;
          const website = (brave?.website as string) ?? (lead.domain as string | null);
          const research = await deepResearchLead(lead.company_name ?? '', website, enrichmentData);
          await supabase
            .from('leads')
            .update({
              enrichment_data: { ...enrichmentData, deep_research: research },
            })
            .eq('id', lead.id);
        } catch (researchErr) {
          logger.error(`Deep research error for ${lead.id}:`, { error: researchErr });
          // Non-critical — scoring still succeeds
        }
      }

      processed++;
    } catch (err) {
      errors++;
      logger.error(`Scoring error for ${lead.id}:`, { error: err });
    }
  }

  // Batch insert all score history records in a single DB call
  if (scoreHistoryBatch.length > 0) {
    const { error: historyError } = await supabase
      .from('lead_score_history')
      .insert(scoreHistoryBatch);
    if (historyError) {
      logger.error('Batch score history insert error:', { error: historyError.message });
    }
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
