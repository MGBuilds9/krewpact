import { createServiceClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { detectStaleDeals } from './stale-deal-detector';
import { detectBidMatches } from './bid-matcher';
import { detectNextActions } from './next-action-suggester';
import { detectBudgetAnomalies } from './budget-anomaly';
import type { EntityType, InsightType, GeneratedInsight } from '../types';

interface InsightResult {
  entityType: EntityType;
  entityId: string;
  insightType: InsightType;
  insight: GeneratedInsight;
  modelUsed: string;
}

export async function generateInsights(orgId: string): Promise<{ generated: number; skipped: number; errors: number }> {
  const supabase = createServiceClient();
  const allInsights: InsightResult[] = [];
  let errors = 0;

  // Run detectors in parallel
  const [staleDeals, bidMatches, nextActions, budgetAnomalies] = await Promise.allSettled([
    detectStaleDeals(orgId),
    detectBidMatches(orgId),
    detectNextActions(orgId),
    detectBudgetAnomalies(orgId),
  ]);

  if (staleDeals.status === 'fulfilled') {
    for (const r of staleDeals.value) {
      allInsights.push({ entityType: 'opportunity', entityId: r.entityId, insightType: 'stale_deal', insight: r.insight, modelUsed: 'gemini-2.0-flash' });
    }
  } else {
    errors++;
    logger.error('Stale deal detector failed', { error: staleDeals.reason });
  }

  if (bidMatches.status === 'fulfilled') {
    for (const r of bidMatches.value) {
      allInsights.push({ entityType: 'lead', entityId: r.entityId, insightType: 'bid_match', insight: r.insight, modelUsed: 'gemini-2.0-flash' });
    }
  } else {
    errors++;
    logger.error('Bid matcher failed', { error: bidMatches.reason });
  }

  if (nextActions.status === 'fulfilled') {
    for (const r of nextActions.value) {
      allInsights.push({ entityType: 'opportunity', entityId: r.entityId, insightType: 'next_action', insight: r.insight, modelUsed: 'rule-based' });
    }
  } else {
    errors++;
    logger.error('Next action suggester failed', { error: nextActions.reason });
  }

  if (budgetAnomalies.status === 'fulfilled') {
    for (const r of budgetAnomalies.value) {
      allInsights.push({ entityType: 'project', entityId: r.entityId, insightType: 'budget_alert', insight: r.insight, modelUsed: 'rule-based' });
    }
  } else {
    errors++;
    logger.error('Budget anomaly detector failed', { error: budgetAnomalies.reason });
  }

  if (allInsights.length === 0) {
    return { generated: 0, skipped: 0, errors };
  }

  // Fetch existing active insights to deduplicate
  const { data: existing } = await supabase
    .from('ai_insights')
    .select('entity_type, entity_id, insight_type')
    .eq('org_id', orgId)
    .is('dismissed_at', null);

  const existingSet = new Set(
    (existing ?? []).map((e: { entity_type: string; entity_id: string; insight_type: string }) => `${e.entity_type}:${e.entity_id}:${e.insight_type}`),
  );

  const newInsights = allInsights.filter((i) => !existingSet.has(`${i.entityType}:${i.entityId}:${i.insightType}`));
  const skipped = allInsights.length - newInsights.length;

  if (newInsights.length === 0) {
    return { generated: 0, skipped, errors };
  }

  // Batch insert new insights
  const rows = newInsights.map((i) => ({
    org_id: orgId,
    entity_type: i.entityType,
    entity_id: i.entityId,
    insight_type: i.insightType,
    title: i.insight.title,
    content: i.insight.content,
    confidence: i.insight.confidence,
    action_url: i.insight.actionUrl ?? null,
    action_label: i.insight.actionLabel ?? null,
    metadata: i.insight.metadata ?? {},
    model_used: i.modelUsed,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7-day expiry
  }));

  const { error: insertErr } = await supabase.from('ai_insights').insert(rows);
  if (insertErr) {
    logger.error('Failed to insert insights', { error: insertErr.message });
    return { generated: 0, skipped, errors: errors + 1 };
  }

  return { generated: newInsights.length, skipped, errors };
}
