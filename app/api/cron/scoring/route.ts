import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { scoreLead } from '@/lib/crm/scoring-engine';
import type { ScoringRule } from '@/lib/crm/scoring-engine';
import { deepResearchLead } from '@/lib/integrations/deep-research';

const BATCH_SIZE = 50;

function isAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.WEBHOOK_SIGNING_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Fetch enriched leads that haven't been scored yet
  const { data: leads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .eq('enrichment_status', 'complete')
    .or('lead_score.is.null,lead_score.eq.0')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 });
  }

  if (!leads || leads.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No leads to score' });
  }

  // Fetch all active scoring rules
  const { data: rules, error: rulesError } = await supabase
    .from('scoring_rules')
    .select('*')
    .eq('is_active', true);

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  if (!rules || rules.length === 0) {
    return NextResponse.json({ success: true, processed: 0, message: 'No active scoring rules' });
  }

  let processed = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      const result = scoreLead(lead as Record<string, unknown>, rules as ScoringRule[]);

      const previousScore = lead.lead_score ?? 0;

      // Update lead scores
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
        console.error(`Score update error for ${lead.id}:`, updateError.message);
        continue;
      }

      // Insert score history
      await supabase.from('lead_score_history').insert({
        lead_id: lead.id,
        score: result.total_score,
        previous_score: previousScore,
        rule_results: result.rule_results as unknown as Record<string, unknown>,
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
          console.error(`Deep research error for ${lead.id}:`, researchErr);
          // Non-critical — scoring still succeeds
        }
      }

      processed++;
    } catch (err) {
      errors++;
      console.error(`Scoring error for ${lead.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    errors,
    total: leads.length,
    rules_count: rules.length,
    timestamp: new Date().toISOString(),
  });
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
