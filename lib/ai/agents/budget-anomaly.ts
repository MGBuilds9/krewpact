import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

import type { GeneratedInsight } from '../types';

export async function detectBudgetAnomalies(
  orgId: string,
): Promise<Array<{ entityId: string; insight: GeneratedInsight }>> {
  const supabase = createServiceClient();

  // Query projects where actual spending > 110% of budget
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, project_name, budget, actual_cost, status')
    .eq('org_id', orgId)
    .not('status', 'in', '("completed","cancelled")')
    .not('budget', 'is', null)
    .gt('budget', 0)
    .order('actual_cost', { ascending: false })
    .limit(20);

  if (error || !projects?.length) {
    if (error) logger.warn('Budget anomaly detection failed', { error: error.message });
    return [];
  }

  const results: Array<{ entityId: string; insight: GeneratedInsight }> = [];

  for (const p of projects) {
    if (!p.actual_cost || !p.budget) continue;
    const ratio = p.actual_cost / p.budget;
    if (ratio <= 1.1) continue; // Only flag >110%

    const overPercent = Math.round((ratio - 1) * 100);
    const overAmount = Math.round(p.actual_cost - p.budget);

    results.push({
      entityId: p.id,
      insight: {
        title: `Budget overrun — ${overPercent}% over budget`,
        content: `"${p.project_name}" has spent $${p.actual_cost.toLocaleString()} against a $${p.budget.toLocaleString()} budget — $${overAmount.toLocaleString()} over. Review expenses or adjust the budget.`,
        confidence: Math.min(0.95, 0.75 + (ratio - 1.1) * 0.5),
        actionUrl: null,
        actionLabel: null,
        metadata: {
          budget: p.budget,
          actual_cost: p.actual_cost,
          ratio: Math.round(ratio * 100) / 100,
          over_amount: overAmount,
        },
      },
    });
  }

  return results;
}
