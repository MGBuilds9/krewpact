import type { SupabaseClient } from '@supabase/supabase-js';

export interface ProcessorResult {
  processed: number;
  completed: number;
  errors: string[];
}

/**
 * Processes all active sequence enrollments where next_step_at <= now.
 *
 * For each enrollment:
 * 1. Fetches the current step from sequence_steps
 * 2. Executes the step based on action_type:
 *    - email: Creates an outreach event record
 *    - task: Creates an activity record
 *    - wait: Just advances to next step
 * 3. Advances current_step, calculates next_step_at based on delay_days/delay_hours
 * 4. If no more steps, marks enrollment status = 'completed'
 */
export async function processSequences(supabase: SupabaseClient): Promise<ProcessorResult> {
  const result: ProcessorResult = { processed: 0, completed: 0, errors: [] };

  // 1. Fetch all active enrollments where next_step_at <= now
  const now = new Date().toISOString();
  const { data: enrollments, error: enrollError } = await supabase
    .from('sequence_enrollments')
    .select('*')
    .eq('status', 'active')
    .lte('next_step_at', now);

  if (enrollError) {
    result.errors.push(`Failed to fetch enrollments: ${enrollError.message}`);
    return result;
  }

  if (!enrollments || enrollments.length === 0) {
    return result;
  }

  for (const enrollment of enrollments) {
    try {
      // 2. Fetch the current step
      const { data: step, error: stepError } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_number', enrollment.current_step)
        .single();

      if (stepError || !step) {
        // No step found — mark as completed
        await supabase
          .from('sequence_enrollments')
          .update({ status: 'completed' })
          .eq('id', enrollment.id);
        result.completed++;
        result.processed++;
        continue;
      }

      // 3. Execute the step based on action_type
      const actionType = step.action_type as string;
      const actionConfig = (step.action_config ?? {}) as Record<string, unknown>;

      if (actionType === 'email') {
        // Create an outreach event record
        const { error: outreachError } = await supabase
          .from('outreach_events')
          .insert({
            lead_id: enrollment.lead_id,
            contact_id: enrollment.contact_id ?? null,
            channel: 'email',
            direction: 'outbound',
            subject: (actionConfig.subject as string) ?? 'Automated sequence email',
            message_preview: (actionConfig.body as string) ?? null,
            sequence_id: enrollment.sequence_id,
            sequence_step: enrollment.current_step,
            is_automated: true,
            occurred_at: now,
          });

        if (outreachError) {
          result.errors.push(
            `Enrollment ${enrollment.id}: Failed to create outreach event: ${outreachError.message}`
          );
          continue;
        }
      } else if (actionType === 'task') {
        // Create an activity record
        const { error: activityError } = await supabase
          .from('activities')
          .insert({
            activity_type: 'task',
            title: (actionConfig.title as string) ?? 'Sequence task',
            details: (actionConfig.description as string) ?? null,
            lead_id: enrollment.lead_id,
            contact_id: enrollment.contact_id ?? null,
          });

        if (activityError) {
          result.errors.push(
            `Enrollment ${enrollment.id}: Failed to create activity: ${activityError.message}`
          );
          continue;
        }
      }
      // 'wait' type — just advance to next step

      // 4. Advance to next step
      const nextStepNumber = enrollment.current_step + 1;

      // Check if next step exists
      const { data: nextStep } = await supabase
        .from('sequence_steps')
        .select('delay_days, delay_hours')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_number', nextStepNumber)
        .single();

      if (nextStep) {
        // Calculate next_step_at
        const nextAt = new Date();
        nextAt.setDate(nextAt.getDate() + (nextStep.delay_days ?? 0));
        nextAt.setHours(nextAt.getHours() + (nextStep.delay_hours ?? 0));

        await supabase
          .from('sequence_enrollments')
          .update({
            current_step: nextStepNumber,
            next_step_at: nextAt.toISOString(),
          })
          .eq('id', enrollment.id);
      } else {
        // No more steps — mark completed
        await supabase
          .from('sequence_enrollments')
          .update({
            status: 'completed',
            next_step_at: null,
          })
          .eq('id', enrollment.id);
        result.completed++;
      }

      result.processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`Enrollment ${enrollment.id}: ${message}`);
    }
  }

  return result;
}
