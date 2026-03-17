import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

import { generateWithGemini } from '../providers/gemini';
import type { GeneratedInsight } from '../types';

export async function detectStaleDeals(
  orgId: string,
): Promise<Array<{ entityId: string; insight: GeneratedInsight }>> {
  const supabase = createServiceClient();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const { data: staleOpps, error } = await supabase
    .from('opportunities')
    .select('id, name, stage, value, updated_at')
    .eq('org_id', orgId)
    .not('stage', 'in', '("contracted","closed_lost")')
    .lt('updated_at', fourteenDaysAgo)
    .order('updated_at', { ascending: true })
    .limit(20);

  if (error || !staleOpps?.length) {
    if (error) logger.warn('Stale deal detection failed', { error: error.message });
    return [];
  }

  const results: Array<{ entityId: string; insight: GeneratedInsight }> = [];

  for (const opp of staleOpps) {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(opp.updated_at).getTime()) / (1000 * 60 * 60 * 24),
    );

    let content: string;
    try {
      content = await generateWithGemini({
        prompt: `Write ONE sentence explaining that the deal "${opp.name}" (stage: ${opp.stage}, value: ${opp.value ? '$' + opp.value.toLocaleString() : 'unknown'}) hasn't been updated in ${daysSinceUpdate} days. Be direct and action-oriented. Example: "This $500K proposal hasn't been touched in 21 days — consider following up or marking as lost."`,
        maxTokens: 80,
        costContext: {
          orgId,
          actionType: 'insight_generated',
          entityType: 'opportunity',
          entityId: opp.id,
        },
      });
    } catch {
      content = `This deal hasn't been updated in ${daysSinceUpdate} days. Consider following up or updating the status.`;
    }

    results.push({
      entityId: opp.id,
      insight: {
        title: `Stale deal — ${daysSinceUpdate} days without activity`,
        content,
        confidence: Math.min(0.95, 0.7 + (daysSinceUpdate - 14) * 0.01),
        actionUrl: null,
        actionLabel: null,
        metadata: { days_stale: daysSinceUpdate, stage: opp.stage, value: opp.value },
      },
    });
  }

  return results;
}
