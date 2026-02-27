import type { SupabaseClient } from '@supabase/supabase-js';

export type TriggerType =
  | 'on_stage_change'
  | 'on_tag_added'
  | 'on_lead_created'
  | 'on_score_threshold'
  | 'on_form_submitted';

export interface TriggerEvent {
  type: TriggerType;
  lead_id: string;
  contact_id?: string;
  data: Record<string, unknown>;
}

export interface EnrollmentResult {
  enrolled: number;
  pending_review: number;
  errors: string[];
}

/**
 * Evaluates a trigger event against all active sequences.
 * If a sequence's trigger_type and trigger_conditions match:
 * - Creates enrollment with status 'pending_review' (for review queue)
 * - Does NOT auto-activate (safeguard)
 *
 * Returns the count of enrollments created.
 */
export async function evaluateTrigger(
  supabase: SupabaseClient,
  event: TriggerEvent,
): Promise<EnrollmentResult> {
  const result: EnrollmentResult = { enrolled: 0, pending_review: 0, errors: [] };

  // 1. Fetch active sequences matching event.type
  const { data: sequences, error: seqError } = await supabase
    .from('sequences')
    .select('id, trigger_type, trigger_conditions, division_id')
    .eq('status', 'active')
    .eq('trigger_type', event.type);

  if (seqError) {
    result.errors.push(`Failed to fetch sequences: ${seqError.message}`);
    return result;
  }

  if (!sequences || sequences.length === 0) {
    return result;
  }

  for (const sequence of sequences) {
    try {
      // 2. Check if trigger_conditions match event.data
      const conditions = sequence.trigger_conditions as Record<string, unknown> | null;
      if (!matchesConditions(event.type, conditions, event.data)) {
        continue;
      }

      // 3. Check if lead already enrolled in this sequence
      const { data: existing, error: existError } = await supabase
        .from('sequence_enrollments')
        .select('id')
        .eq('sequence_id', sequence.id)
        .eq('lead_id', event.lead_id)
        .in('status', ['pending_review', 'active', 'paused'])
        .maybeSingle();

      if (existError) {
        result.errors.push(
          `Sequence ${sequence.id}: Failed to check existing enrollment: ${existError.message}`,
        );
        continue;
      }

      if (existing) {
        // Already enrolled — skip
        continue;
      }

      // 4. Find first step to calculate next_step_at
      const { data: firstStep, error: stepError } = await supabase
        .from('sequence_steps')
        .select('id, step_number, delay_days, delay_hours')
        .eq('sequence_id', sequence.id)
        .order('step_number', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (stepError) {
        result.errors.push(
          `Sequence ${sequence.id}: Failed to fetch first step: ${stepError.message}`,
        );
        continue;
      }

      // 5. Calculate next_step_at
      const nextAt = new Date();
      if (firstStep) {
        nextAt.setDate(nextAt.getDate() + (firstStep.delay_days ?? 0));
        nextAt.setHours(nextAt.getHours() + (firstStep.delay_hours ?? 0));
      }

      // 6. Create enrollment with status='pending_review'
      const { error: insertError } = await supabase.from('sequence_enrollments').insert({
        sequence_id: sequence.id,
        lead_id: event.lead_id,
        contact_id: event.contact_id ?? null,
        status: 'pending_review',
        current_step: firstStep ? firstStep.step_number : 1,
        current_step_id: firstStep ? firstStep.id : null,
        next_step_at: nextAt.toISOString(),
        trigger_type: event.type,
        trigger_event: event.data,
        enrolled_at: new Date().toISOString(),
      });

      if (insertError) {
        result.errors.push(
          `Sequence ${sequence.id}: Failed to create enrollment: ${insertError.message}`,
        );
        continue;
      }

      result.enrolled++;
      result.pending_review++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`Sequence ${sequence.id}: ${message}`);
    }
  }

  return result;
}

/**
 * Evaluates whether trigger conditions match event data.
 */
export function matchesConditions(
  triggerType: TriggerType,
  conditions: Record<string, unknown> | null,
  eventData: Record<string, unknown>,
): boolean {
  switch (triggerType) {
    case 'on_lead_created':
      // Always match — no conditions required
      return true;

    case 'on_stage_change':
      if (!conditions) return true;
      // Match if conditions.stage equals event data stage (or no stage filter)
      if (conditions.stage !== undefined) {
        return conditions.stage === eventData.stage;
      }
      return true;

    case 'on_tag_added':
      if (!conditions) return true;
      if (conditions.tag_id !== undefined) {
        return conditions.tag_id === eventData.tag_id;
      }
      return true;

    case 'on_score_threshold': {
      if (!conditions) return false;
      const minScore = conditions.min_score as number | undefined;
      const score = eventData.score as number | undefined;
      if (minScore === undefined || score === undefined) return false;
      return score >= minScore;
    }

    case 'on_form_submitted':
      if (!conditions) return true;
      if (conditions.form_id !== undefined) {
        return conditions.form_id === eventData.form_id;
      }
      return true;

    default:
      return false;
  }
}

/**
 * Approve a pending enrollment — sets status to 'active'.
 */
export async function approveEnrollment(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'active' })
    .eq('id', enrollmentId)
    .eq('status', 'pending_review');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reject a pending enrollment — sets status to 'cancelled'.
 */
export async function rejectEnrollment(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'cancelled' })
    .eq('id', enrollmentId)
    .eq('status', 'pending_review');

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
