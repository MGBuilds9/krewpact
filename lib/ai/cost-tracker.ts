import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

import type { CostEntry } from './types';

// Approximate costs per 1M tokens (in cents)
const COST_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 8, output: 30 }, // $0.075/$0.30
  'claude-haiku-4-5-20251001': { input: 80, output: 400 }, // $0.80/$4.00
  'text-embedding-ada-002': { input: 10, output: 0 }, // $0.10
};

function estimateCostCents(model: string, inputTokens?: number, outputTokens?: number): number {
  const rates = COST_PER_1M_TOKENS[model];
  if (!rates) return 0;
  const inCost = ((inputTokens ?? 0) / 1_000_000) * rates.input;
  const outCost = ((outputTokens ?? 0) / 1_000_000) * rates.output;
  return Math.round((inCost + outCost) * 100) / 100; // round to nearest 0.01 cent
}

export async function trackAIAction(entry: CostEntry): Promise<void> {
  try {
    const supabase = createServiceClient();
    const costCents =
      entry.costCents ?? estimateCostCents(entry.modelUsed, entry.inputTokens, entry.outputTokens);

    await supabase.from('ai_actions').insert({
      org_id: entry.orgId,
      user_id: entry.userId ?? null,
      action_type: entry.actionType,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      model_used: entry.modelUsed,
      input_tokens: entry.inputTokens ?? null,
      output_tokens: entry.outputTokens ?? null,
      cost_cents: costCents,
      latency_ms: entry.latencyMs ?? null,
    });
  } catch (err) {
    // Non-critical — don't let tracking failures break the main flow
    logger.warn('Failed to track AI action', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
