import type { SupabaseClient } from '@supabase/supabase-js';

import { evaluateCondition } from './sequence-conditions';
import { createFinalDispositionTask } from './sequence-disposition';
import { checkAndMoveToDLQ } from './sequence-dlq';
import { executeEmailStep } from './sequence-email-executor';
import type { ProcessorOptions, ProcessorResult } from './sequence-types';

export { evaluateCondition } from './sequence-conditions';
export type {
  EmailSender,
  ProcessorOptions,
  ProcessorResult,
  TemplateResolver,
} from './sequence-types';

/** Action types that create manual task reminders for salespeople */
const MANUAL_ACTION_TYPES = ['call', 'linkedin', 'meeting', 'site_visit'] as const;
const MANUAL_ACTION_LABELS: Record<string, string> = {
  call: 'Make a phone call',
  linkedin: 'Send LinkedIn message',
  meeting: 'Schedule a meeting',
  site_visit: 'Conduct a site visit',
};

const BATCH_SIZE = 50;

interface EnrollmentCtx {
  supabase: SupabaseClient;
  enrollment: Record<string, unknown>;
  now: string;
  options: ProcessorOptions;
  result: ProcessorResult;
}

async function processEnrollmentSafe(ctx: EnrollmentCtx): Promise<void> {
  try {
    await processEnrollment(ctx);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    ctx.result.errors.push(`Enrollment ${ctx.enrollment.id}: ${message}`);
    await handleDLQ(ctx.supabase, ctx.enrollment, message, ctx.result);
  }
}

async function handleDLQ(
  supabase: SupabaseClient,
  enrollment: Record<string, unknown>,
  message: string,
  result: ProcessorResult,
): Promise<void> {
  try {
    const stepId = enrollment.current_step_id ?? '';
    const movedToDLQ = await checkAndMoveToDLQ(
      supabase,
      enrollment.id as string,
      stepId as string,
      message,
    );
    if (movedToDLQ) result.deadLettered++;
  } catch (dlqErr) {
    const dlqMsg = dlqErr instanceof Error ? dlqErr.message : String(dlqErr);
    result.errors.push(`DLQ handling failed for ${enrollment.id}: ${dlqMsg}`);
  }
}

/**
 * Processes all active sequence enrollments where next_step_at <= now.
 */
export async function processSequences(
  supabase: SupabaseClient,
  options: ProcessorOptions = {},
): Promise<ProcessorResult> {
  const result: ProcessorResult = { processed: 0, completed: 0, errors: [], deadLettered: 0 };
  const now = new Date().toISOString();

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
      await processEnrollmentSafe({ supabase, enrollment, now, options, result });
    }

    if (enrollments.length < BATCH_SIZE) {
      hasMore = false;
    } else {
      offset += BATCH_SIZE;
    }
  }

  return result;
}

async function processEnrollment(ctx: EnrollmentCtx): Promise<void> {
  const { supabase, enrollment, now, options, result } = ctx;

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
    await supabase
      .from('sequence_enrollments')
      .update({ status: 'completed', next_step_at: null })
      .eq('id', enrollment.id);
    result.completed++;
    result.processed++;
    return;
  }

  const actionType = step.action_type as string;
  const actionConfig = (step.action_config ?? {}) as Record<string, unknown>;
  const conditionType = step.condition_type as string | null | undefined;

  await executeStepAction({ supabase, enrollment, step, actionType, actionConfig, now, options });

  const nextStepId = await resolveNextStepId({ supabase, enrollment, step, conditionType });
  await advanceEnrollment({ supabase, enrollment, step, nextStepId, result, options });

  result.processed++;
}

interface StepActionCtx {
  supabase: SupabaseClient;
  enrollment: Record<string, unknown>;
  step: Record<string, unknown>;
  actionType: string;
  actionConfig: Record<string, unknown>;
  now: string;
  options: ProcessorOptions;
}

interface TaskNotifyCtx {
  supabase: SupabaseClient;
  enrollment: Record<string, unknown>;
  assignedToId: string;
  taskTitle: string;
  lead: Record<string, unknown> | null;
  options: ProcessorOptions;
}

async function notifyTaskAssignee(ctx: TaskNotifyCtx): Promise<void> {
  const { supabase, enrollment, assignedToId, taskTitle, lead, options } = ctx;
  if (!options.onTaskCreated) return;
  const { data: assignee } = await supabase
    .from('users')
    .select('email, first_name, last_name')
    .eq('id', assignedToId)
    .single();
  if (!assignee?.email) return;
  const leadCompany = (lead?.company_name as string) ?? 'Unknown Company';
  const assigneeName =
    [assignee.first_name, assignee.last_name].filter(Boolean).join(' ') || 'Team Member';
  await options.onTaskCreated({
    assigneeEmail: assignee.email as string,
    assigneeName,
    taskTitle,
    leadCompany,
    leadId: enrollment.lead_id as string,
  });
}

async function executeTaskStep(ctx: StepActionCtx): Promise<void> {
  const { supabase, enrollment, actionConfig, now, options } = ctx;
  const lead = enrollment.leads as Record<string, unknown> | null;
  const assignedToId = lead?.assigned_to as string | null;
  const taskTitle = (actionConfig.title as string) ?? 'Sequence task';
  const { error } = await supabase.from('activities').insert({
    activity_type: 'task',
    title: taskTitle,
    details: (actionConfig.description as string) ?? null,
    lead_id: enrollment.lead_id,
    contact_id: enrollment.contact_id ?? null,
    owner_user_id: assignedToId ?? null,
    due_at: now,
  });
  if (error) throw new Error(`Failed to create activity: ${error.message}`);
  if (assignedToId)
    await notifyTaskAssignee({ supabase, enrollment, assignedToId, taskTitle, lead, options });
}

async function executeManualStep(ctx: StepActionCtx): Promise<void> {
  const { supabase, enrollment, step, actionType, actionConfig, now } = ctx;
  const label = MANUAL_ACTION_LABELS[actionType] ?? actionType;
  const { error } = await supabase.from('activities').insert({
    activity_type: 'task',
    title: (actionConfig.title as string) ?? `${label} — Sequence reminder`,
    details: (actionConfig.description as string) ?? `Action required: ${label}`,
    lead_id: enrollment.lead_id,
    contact_id: enrollment.contact_id ?? null,
    due_at: new Date().toISOString(),
  });
  if (error) throw new Error(`Failed to create ${actionType} reminder: ${error.message}`);
  await supabase.from('outreach').insert({
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

async function executeStepAction(ctx: StepActionCtx): Promise<void> {
  const { supabase, enrollment, step, actionType, actionConfig, now, options } = ctx;
  if (actionType === 'email') {
    await executeEmailStep({ supabase, enrollment, step, actionConfig, now, options });
  } else if (actionType === 'task') {
    await executeTaskStep({ supabase, enrollment, step, actionType, actionConfig, now, options });
  } else if (MANUAL_ACTION_TYPES.includes(actionType as (typeof MANUAL_ACTION_TYPES)[number])) {
    await executeManualStep({ supabase, enrollment, step, actionType, actionConfig, now, options });
  }
  // 'wait' and 'condition' types — no action, just advance/branch
}

interface ResolveNextCtx {
  supabase: SupabaseClient;
  enrollment: Record<string, unknown>;
  step: Record<string, unknown>;
  conditionType: string | null | undefined;
}

async function resolveNextStepId(ctx: ResolveNextCtx): Promise<string | null> {
  const { supabase, enrollment, step, conditionType } = ctx;

  if (conditionType) {
    const conditionConfig = (step.condition_config ?? {}) as Record<string, unknown>;
    const conditionMet = await evaluateCondition(
      supabase,
      enrollment as Record<string, unknown>,
      conditionType,
      conditionConfig,
    );
    if (conditionMet && step.true_next_step_id) return step.true_next_step_id as string;
    if (!conditionMet && step.false_next_step_id) return step.false_next_step_id as string;
    return null;
  }

  if (step.true_next_step_id) return step.true_next_step_id as string;
  if (step.false_next_step_id) return step.false_next_step_id as string;
  return null;
}

interface AdvanceEnrollmentCtx {
  supabase: SupabaseClient;
  enrollment: Record<string, unknown>;
  step: Record<string, unknown>;
  nextStepId: string | null;
  result: ProcessorResult;
  options: ProcessorOptions;
}

async function advanceEnrollment(ctx: AdvanceEnrollmentCtx): Promise<void> {
  const { supabase, enrollment, step, nextStepId, result, options } = ctx;
  let nextStep: {
    id: string;
    step_number: number;
    delay_days: number | null;
    delay_hours: number | null;
  } | null = null;

  if (nextStepId) {
    const { data } = await supabase
      .from('sequence_steps')
      .select('id, step_number, delay_days, delay_hours')
      .eq('id', nextStepId)
      .single();
    nextStep = data ?? null;
  } else {
    const nextStepNumber = (step.step_number as number) + 1;
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
    await supabase
      .from('sequence_enrollments')
      .update({ status: 'completed', next_step_at: null })
      .eq('id', enrollment.id);
    result.completed++;

    await createFinalDispositionTask(supabase, enrollment, options);
  }
}
