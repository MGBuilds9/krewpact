import type { SupabaseClient } from '@supabase/supabase-js';

import type { ProcessorOptions } from './sequence-types';

/**
 * Creates a "Final disposition" task when a sequence completes with no engagement.
 * Checks outreach records for any response (replied, opened, clicked) — if none found,
 * creates a task so the lead doesn't fall through the cracks.
 */
export async function createFinalDispositionTask(
  supabase: SupabaseClient,
  enrollment: Record<string, unknown>,
  options: ProcessorOptions,
): Promise<void> {
  const { count } = await supabase
    .from('outreach')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', enrollment.lead_id as string)
    .eq('sequence_id', enrollment.sequence_id as string)
    .in('outcome', ['replied', 'opened', 'clicked']);

  if (count && count > 0) return;

  const lead = enrollment.leads as Record<string, unknown> | null;
  const companyName = (lead?.company_name as string) ?? 'Unknown lead';
  const assignedToId = lead?.assigned_to as string | null;

  const { error: insertError } = await supabase.from('activities').insert({
    activity_type: 'task',
    title: `Final disposition: ${companyName}`,
    details: 'Sequence completed with no response. Review and decide: follow up or mark as cold.',
    lead_id: enrollment.lead_id,
    contact_id: enrollment.contact_id ?? null,
    owner_user_id: assignedToId ?? null,
    due_at: new Date().toISOString(),
  });

  if (insertError)
    throw new Error(`Failed to create final disposition task: ${insertError.message}`);

  if (assignedToId && options.onTaskCreated) {
    const { data: assignee } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', assignedToId)
      .single();
    if (assignee?.email) {
      const assigneeName =
        [assignee.first_name, assignee.last_name].filter(Boolean).join(' ') || 'Team Member';
      await options.onTaskCreated({
        assigneeEmail: assignee.email as string,
        assigneeName,
        taskTitle: `Final disposition: ${companyName}`,
        leadCompany: companyName,
        leadId: enrollment.lead_id as string,
      });
    }
  }
}
