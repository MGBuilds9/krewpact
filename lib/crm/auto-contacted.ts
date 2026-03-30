import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';

/**
 * Auto-promote a lead to "contacted" when outreach is first recorded.
 * Only promotes if the lead is currently in "qualified" stage.
 * No-op if already contacted or further along the pipeline.
 */
export async function maybePromoteToContacted(
  leadId: string,
  supabase: SupabaseClient,
  changedBy?: string,
): Promise<void> {
  const { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('id, status')
    .eq('id', leadId)
    .single();

  if (fetchError || !lead) return;
  if (lead.status !== 'qualified') return;

  const { error: updateError } = await supabase
    .from('leads')
    .update({ status: 'contacted' })
    .eq('id', leadId)
    .eq('status', 'qualified'); // optimistic lock

  if (updateError) {
    logger.warn('Auto-contacted promotion failed', { leadId, error: updateError.message });
    return;
  }

  // Record in stage history (non-critical)
  try {
    await supabase.from('lead_stage_history').insert({
      lead_id: leadId,
      from_stage: 'qualified',
      to_stage: 'contacted',
      notes: 'Auto-promoted: first outreach sent',
      changed_by: changedBy ?? null,
    });
  } catch {
    logger.error('Failed to record auto-contacted stage history', { leadId });
  }
}
