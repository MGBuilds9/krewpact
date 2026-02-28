import type { SupabaseClient } from '@supabase/supabase-js';
import { checkAndMoveToDLQ } from './sequence-dlq';

export interface ProcessorResult {
  processed: number;
  completed: number;
  errors: string[];
  deadLettered: number;
}

/**
 * Email sender callback — injected by the cron route to send real emails.
 * If not provided, the processor only creates outreach_event records.
 */
export interface EmailSender {
  send(params: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    enrollmentId: string;
    leadId: string;
  }): Promise<{ success: boolean; error?: string }>;
}

/**
 * Template resolver — injected by cron route to fetch and render email templates.
 */
export interface TemplateResolver {
  resolve(
    templateId: string,
    variables: Record<string, string>,
  ): Promise<{ subject: string; html: string; text?: string } | null>;
}

export interface ProcessorOptions {
  emailSender?: EmailSender;
  templateResolver?: TemplateResolver;
}

/** Action types that create manual task reminders for salespeople */
const MANUAL_ACTION_TYPES = ['call', 'linkedin', 'meeting', 'site_visit'] as const;
const MANUAL_ACTION_LABELS: Record<string, string> = {
  call: 'Make a phone call',
  linkedin: 'Send LinkedIn message',
  meeting: 'Schedule a meeting',
  site_visit: 'Conduct a site visit',
};

const BATCH_SIZE = 50;

/**
 * Processes all active sequence enrollments where next_step_at <= now.
 *
 * For each enrollment:
 * 1. Fetches the current step (by current_step_id if set, fallback to step_number)
 * 2. Executes the step based on action_type:
 *    - email: Creates an outreach event record (+ sends via EmailSender if provided)
 *    - task: Creates an activity record
 *    - call/linkedin/meeting/site_visit: Creates a manual task reminder activity
 *    - wait: Just advances to next step
 *    - condition: Evaluates condition, branches to true_next_step_id or false_next_step_id
 * 3. If step has condition_type, evaluates and follows branch
 * 4. Falls back to step_number+1 when no branching ids are set
 * 5. If no more steps, marks enrollment status = 'completed'
 * 6. On error: uses DLQ (3 retries, then dead_letter)
 */
export async function processSequences(
  supabase: SupabaseClient,
  options: ProcessorOptions = {},
): Promise<ProcessorResult> {
  const result: ProcessorResult = { processed: 0, completed: 0, errors: [], deadLettered: 0 };

  const now = new Date().toISOString();

  // Fetch in batches of 50
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: enrollments, error: enrollError } = await supabase
      .from('sequence_enrollments')
      .select('*, leads(*), contacts(*)')
      .eq('status', 'active')
      .lte('next_step_at', now)
      .range(offset, offset + BATCH_SIZE - 1);

    if (enrollError) {
      result.errors.push(`Failed to fetch enrollments: ${enrollError.message}`);
      return result;
    }

    if (!enrollments || enrollments.length === 0) {
      hasMore = false;
      break;
    }

    for (const enrollment of enrollments) {
      try {
        // 2. Fetch the current step — prefer current_step_id, fallback to step_number
        let stepQuery = supabase
          .from('sequence_steps')
          .select('*')
          .eq('sequence_id', enrollment.sequence_id);

        if (enrollment.current_step_id) {
          stepQuery = stepQuery.eq('id', enrollment.current_step_id);
        } else {
          stepQuery = stepQuery.eq('step_number', enrollment.current_step);
        }

        const { data: step, error: stepError } = await stepQuery.single();

        if (stepError || !step) {
          // No step found — mark as completed
          await supabase
            .from('sequence_enrollments')
            .update({ status: 'completed', next_step_at: null })
            .eq('id', enrollment.id);
          result.completed++;
          result.processed++;
          continue;
        }

        const actionType = step.action_type as string;
        const actionConfig = (step.action_config ?? {}) as Record<string, unknown>;
        const conditionType = step.condition_type as string | null | undefined;

        // 3. Execute the step based on action_type
        if (actionType === 'email') {
          await executeEmailStep(supabase, enrollment, step, actionConfig, now, options);
        } else if (actionType === 'task') {
          const { error: activityError } = await supabase.from('activities').insert({
            activity_type: 'task',
            title: (actionConfig.title as string) ?? 'Sequence task',
            details: (actionConfig.description as string) ?? null,
            lead_id: enrollment.lead_id,
            contact_id: enrollment.contact_id ?? null,
          });

          if (activityError) {
            throw new Error(`Failed to create activity: ${activityError.message}`);
          }
        } else if (MANUAL_ACTION_TYPES.includes(actionType as typeof MANUAL_ACTION_TYPES[number])) {
          // Manual action types: create a task reminder for the salesperson
          const label = MANUAL_ACTION_LABELS[actionType] ?? actionType;
          const { error: activityError } = await supabase.from('activities').insert({
            activity_type: 'task',
            title: (actionConfig.title as string) ?? `${label} — Sequence reminder`,
            details: (actionConfig.description as string) ?? `Action required: ${label}`,
            lead_id: enrollment.lead_id,
            contact_id: enrollment.contact_id ?? null,
            due_at: new Date().toISOString(),
          });

          if (activityError) {
            throw new Error(`Failed to create ${actionType} reminder: ${activityError.message}`);
          }

          // Also log as outreach event with the appropriate channel
          await supabase.from('outreach_events').insert({
            lead_id: enrollment.lead_id,
            contact_id: enrollment.contact_id ?? null,
            channel: actionType,
            direction: 'outbound',
            subject: (actionConfig.title as string) ?? `${label} reminder`,
            sequence_id: enrollment.sequence_id,
            sequence_step: step.step_number,
            is_automated: true,
            occurred_at: now,
          });
        }
        // 'wait' and 'condition' types — no action, just advance/branch

        // 4. Determine next step — condition branching or linear fallback
        let nextStepId: string | null = null;
        let nextStepNumber: number | null = null;

        if (conditionType) {
          // Evaluate condition and branch
          const conditionConfig = (step.condition_config ?? {}) as Record<string, unknown>;
          const conditionMet = await evaluateCondition(
            supabase,
            enrollment as Record<string, unknown>,
            conditionType,
            conditionConfig,
          );

          if (conditionMet && step.true_next_step_id) {
            nextStepId = step.true_next_step_id as string;
          } else if (!conditionMet && step.false_next_step_id) {
            nextStepId = step.false_next_step_id as string;
          }
          // If no branch target set, fall through to linear logic below
        }

        // If no branching, check explicit next step ids on the step itself
        if (!nextStepId && !conditionType) {
          if (step.true_next_step_id) {
            nextStepId = step.true_next_step_id as string;
          } else if (step.false_next_step_id) {
            nextStepId = step.false_next_step_id as string;
          }
        }

        // Linear fallback: use step_number + 1
        if (!nextStepId) {
          nextStepNumber = (step.step_number as number) + 1;
        }

        // 5. Fetch next step details for delay calculation
        let nextStep: { id: string; step_number: number; delay_days: number | null; delay_hours: number | null } | null = null;

        if (nextStepId) {
          const { data } = await supabase
            .from('sequence_steps')
            .select('id, step_number, delay_days, delay_hours')
            .eq('id', nextStepId)
            .single();
          nextStep = data ?? null;
        } else if (nextStepNumber !== null) {
          const { data } = await supabase
            .from('sequence_steps')
            .select('id, step_number, delay_days, delay_hours')
            .eq('sequence_id', enrollment.sequence_id)
            .eq('step_number', nextStepNumber)
            .single();
          nextStep = data ?? null;
        }

        if (nextStep) {
          const nextAt = new Date();
          nextAt.setDate(nextAt.getDate() + (nextStep.delay_days ?? 0));
          nextAt.setHours(nextAt.getHours() + (nextStep.delay_hours ?? 0));

          await supabase
            .from('sequence_enrollments')
            .update({
              current_step: nextStep.step_number,
              current_step_id: nextStep.id,
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

        // DLQ: check retries and move to dead_letter if exceeded
        try {
          const stepId = enrollment.current_step_id ?? '';
          const movedToDLQ = await checkAndMoveToDLQ(
            supabase,
            enrollment.id,
            stepId,
            message,
          );
          if (movedToDLQ) {
            result.deadLettered++;
          }
        } catch (dlqErr) {
          const dlqMsg = dlqErr instanceof Error ? dlqErr.message : String(dlqErr);
          result.errors.push(`DLQ handling failed for ${enrollment.id}: ${dlqMsg}`);
        }
      }
    }

    if (enrollments.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      offset += BATCH_SIZE;
    }
  }

  return result;
}

/**
 * Executes an email step: creates outreach record + optionally sends via EmailSender.
 */
async function executeEmailStep(
  supabase: SupabaseClient,
  enrollment: Record<string, unknown>,
  step: Record<string, unknown>,
  actionConfig: Record<string, unknown>,
  now: string,
  options: ProcessorOptions,
): Promise<void> {
  const templateId = actionConfig.template_id as string | undefined;
  let subject = (actionConfig.subject as string) ?? 'Automated sequence email';
  let html = (actionConfig.body as string) ?? '';
  let text: string | undefined;
  let sendResult: { success: boolean; error?: string } | undefined;

  // If template_id is configured and we have a resolver, render the template
  if (templateId && options.templateResolver) {
    const contact = (enrollment.contacts ?? {}) as Record<string, unknown>;
    const lead = (enrollment.leads ?? {}) as Record<string, unknown>;

    const rendered = await options.templateResolver.resolve(templateId, {
      first_name: (contact.first_name as string) ?? '',
      last_name: (contact.last_name as string) ?? '',
      company_name: (lead.company_name as string) ?? '',
      full_name: (contact.full_name as string) ?? '',
    });

    if (rendered) {
      subject = rendered.subject;
      html = rendered.html;
      text = rendered.text;
    }
  }

  // Send real email if sender is provided
  const contactEmail = ((enrollment.contacts ?? {}) as Record<string, unknown>).email as string | undefined;
  if (options.emailSender && contactEmail) {
    sendResult = await options.emailSender.send({
      to: contactEmail,
      subject,
      html,
      text,
      enrollmentId: enrollment.id as string,
      leadId: enrollment.lead_id as string,
    });
  }

  // Create outreach event record
  const { error: outreachError } = await supabase.from('outreach_events').insert({
    lead_id: enrollment.lead_id,
    contact_id: enrollment.contact_id ?? null,
    channel: 'email',
    direction: 'outbound',
    subject,
    message_preview: html.substring(0, 500) || null,
    sequence_id: enrollment.sequence_id,
    sequence_step: step.step_number,
    is_automated: true,
    occurred_at: now,
    outcome: sendResult?.success === false ? 'failed' : sendResult?.success ? 'sent' : undefined,
    outcome_detail: sendResult?.error ?? null,
  });

  if (outreachError) {
    throw new Error(`Failed to create outreach event: ${outreachError.message}`);
  }
}

/**
 * Evaluates a condition for a sequence step.
 * Returns true if the condition is met, false otherwise.
 */
export async function evaluateCondition(
  supabase: SupabaseClient,
  enrollment: Record<string, unknown>,
  conditionType: string,
  conditionConfig: Record<string, unknown>,
): Promise<boolean> {
  const leadId = enrollment.lead_id as string;

  switch (conditionType) {
    case 'if_score': {
      const threshold = conditionConfig.threshold as number | undefined;
      if (threshold === undefined) return false;

      const { data: lead } = await supabase
        .from('leads')
        .select('computed_score')
        .eq('id', leadId)
        .single();

      if (!lead) return false;
      const score = (lead.computed_score as number) ?? 0;
      return score >= threshold;
    }

    case 'if_email_opened': {
      const { data: outreach } = await supabase
        .from('outreach_events')
        .select('opened_at')
        .eq('lead_id', leadId)
        .eq('sequence_id', enrollment.sequence_id)
        .not('opened_at', 'is', null)
        .limit(1)
        .maybeSingle();

      return outreach !== null;
    }

    case 'if_replied': {
      const { data: outreach } = await supabase
        .from('outreach_events')
        .select('replied_at')
        .eq('lead_id', leadId)
        .eq('sequence_id', enrollment.sequence_id)
        .not('replied_at', 'is', null)
        .limit(1)
        .maybeSingle();

      return outreach !== null;
    }

    case 'if_tag': {
      const tagId = conditionConfig.tag_id as string | undefined;
      if (!tagId) return false;

      const { data: tagLink } = await supabase
        .from('entity_tags')
        .select('id')
        .eq('entity_type', 'lead')
        .eq('entity_id', leadId)
        .eq('tag_id', tagId)
        .maybeSingle();

      return tagLink !== null;
    }

    case 'if_stage': {
      const stage = conditionConfig.stage as string | undefined;
      if (!stage) return false;

      const { data: lead } = await supabase
        .from('leads')
        .select('stage')
        .eq('id', leadId)
        .single();

      if (!lead) return false;
      return (lead.stage as string) === stage;
    }

    default:
      return false;
  }
}
