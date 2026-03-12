import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { GeneratedInsight } from '../types';

// Stage-based action recommendations — no LLM needed, pure templates
const STAGE_ACTIONS: Record<string, { action: string; threshold_days: number }> = {
  intake: { action: 'Schedule a site visit to assess the project scope', threshold_days: 3 },
  site_visit: { action: 'Create an estimate based on the site visit findings', threshold_days: 7 },
  estimating: { action: 'Finalize the estimate and prepare a proposal', threshold_days: 10 },
  proposal: { action: 'Follow up on the proposal — ask if they have questions', threshold_days: 5 },
  negotiation: { action: 'Push for contract signing — address any remaining concerns', threshold_days: 7 },
};

export async function detectNextActions(orgId: string): Promise<Array<{ entityId: string; insight: GeneratedInsight }>> {
  const supabase = createServiceClient();

  const { data: opps, error } = await supabase
    .from('opportunities')
    .select('id, name, stage, value, updated_at')
    .eq('org_id', orgId)
    .not('stage', 'in', '("contracted","closed_lost")')
    .order('updated_at', { ascending: true })
    .limit(30);

  if (error || !opps?.length) {
    if (error) logger.warn('Next action detection failed', { error: error.message });
    return [];
  }

  const results: Array<{ entityId: string; insight: GeneratedInsight }> = [];

  for (const opp of opps) {
    const stageConfig = STAGE_ACTIONS[opp.stage];
    if (!stageConfig) continue;

    const daysInStage = Math.floor((Date.now() - new Date(opp.updated_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysInStage < stageConfig.threshold_days) continue;

    results.push({
      entityId: opp.id,
      insight: {
        title: `Next step: ${stageConfig.action.split('—')[0].trim()}`,
        content: `${opp.name} has been in "${opp.stage}" for ${daysInStage} days. ${stageConfig.action}.`,
        confidence: Math.min(0.95, 0.75 + (daysInStage - stageConfig.threshold_days) * 0.02),
        actionUrl: null,
        actionLabel: null,
        metadata: { stage: opp.stage, days_in_stage: daysInStage },
      },
    });
  }

  return results;
}
