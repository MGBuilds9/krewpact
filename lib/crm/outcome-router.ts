import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';

export type DispositionOutcome = 'interested' | 'follow_up' | 'not_interested' | 'no_answer';

export interface DispositionOptions {
  followUpDays?: number; // default 3
  notes?: string;
}

export interface DispositionResult {
  activityUpdated: boolean;
  leadStatusChanged?: string;
  sequenceStopped?: boolean;
  followUpCreated?: boolean;
  followUpActivityId?: string;
  opportunityCreated?: boolean;
  opportunityId?: string;
}

/**
 * Routes an activity disposition outcome to the correct CRM actions.
 *
 * Pure business logic — takes a Supabase client, activity ID, and outcome,
 * then executes the appropriate DB updates:
 *
 * - interested: lead → qualified, stop sequences, create opportunity
 * - follow_up: create follow-up task in N days
 * - not_interested: lead → lost, stop sequences
 * - no_answer: retry up to 3 times, then mark cold (lost)
 */
export async function routeOutcome(
  supabase: SupabaseClient,
  activityId: string,
  outcome: DispositionOutcome,
  options?: DispositionOptions,
): Promise<DispositionResult> {
  const now = new Date().toISOString();

  // 1. Fetch the activity
  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .select('id, title, lead_id, contact_id, owner_user_id, org_id')
    .eq('id', activityId)
    .single();

  if (activityError || !activity) {
    logger.error('Failed to fetch activity for disposition', {
      activityId,
      error: activityError?.message,
    });
    throw new Error(`Activity not found: ${activityId}`);
  }

  // 2. Update the activity as completed with the outcome
  const { error: updateError } = await supabase
    .from('activities')
    .update({
      completed_at: now,
      outcome,
      details: options?.notes ? `${outcome}: ${options.notes}` : undefined,
      updated_at: now,
    })
    .eq('id', activityId);

  if (updateError) {
    logger.error('Failed to update activity disposition', {
      activityId,
      error: updateError.message,
    });
    throw new Error(`Failed to update activity: ${updateError.message}`);
  }

  const result: DispositionResult = { activityUpdated: true };

  // 3. Route based on outcome
  switch (outcome) {
    case 'interested':
      await handleInterested(supabase, activity, result, now);
      break;
    case 'follow_up':
      await handleFollowUp(supabase, activity, result, { options, now });
      break;
    case 'not_interested':
      await handleNotInterested(supabase, activity, result, now);
      break;
    case 'no_answer':
      await handleNoAnswer(supabase, activity, result, now);
      break;
  }

  logger.info('Disposition routed', {
    activityId,
    outcome,
    leadId: activity.lead_id,
    result,
  });

  return result;
}

async function handleInterested(
  supabase: SupabaseClient,
  activity: Record<string, unknown>,
  result: DispositionResult,
  now: string,
) {
  const leadId = activity.lead_id as string | null;
  if (!leadId) return;

  // Update lead status to qualified
  await supabase.from('leads').update({ status: 'qualified', updated_at: now }).eq('id', leadId);
  result.leadStatusChanged = 'qualified';

  // Stop active sequence enrollments
  const stopped = await stopActiveEnrollments(supabase, leadId, now);
  result.sequenceStopped = stopped;

  // Create opportunity for this qualified lead
  const { data: lead } = await supabase
    .from('leads')
    .select('org_id, division_id, company_name, assigned_to')
    .eq('id', leadId)
    .single();

  if (lead) {
    const { data: opp } = await supabase
      .from('opportunities')
      .insert({
        org_id: lead.org_id,
        lead_id: leadId,
        division_id: lead.division_id,
        opportunity_name: `${lead.company_name ?? 'New'} — Opportunity`,
        stage: 'intake',
        owner_user_id: lead.assigned_to ?? (activity.owner_user_id as string),
        probability_pct: 20,
      })
      .select('id')
      .single();

    if (opp) {
      result.opportunityCreated = true;
      result.opportunityId = opp.id;
    }
  }
}

async function handleFollowUp(
  supabase: SupabaseClient,
  activity: Record<string, unknown>,
  result: DispositionResult,
  config: { options?: DispositionOptions; now: string },
) {
  const days = config.options?.followUpDays ?? 3;
  const dueAt = new Date(config.now);
  dueAt.setDate(dueAt.getDate() + days);

  const title = activity.title as string;

  const { data: followUp } = await supabase
    .from('activities')
    .insert({
      org_id: activity.org_id,
      activity_type: 'task',
      title: `Follow up: ${title}`,
      lead_id: activity.lead_id,
      contact_id: activity.contact_id,
      owner_user_id: activity.owner_user_id,
      due_at: dueAt.toISOString(),
      details: config.options?.notes ?? null,
    })
    .select('id')
    .single();

  if (followUp) {
    result.followUpCreated = true;
    result.followUpActivityId = followUp.id;
  }
}

async function handleNotInterested(
  supabase: SupabaseClient,
  activity: Record<string, unknown>,
  result: DispositionResult,
  now: string,
) {
  const leadId = activity.lead_id as string | null;
  if (!leadId) return;

  // Update lead status to lost
  await supabase
    .from('leads')
    .update({ status: 'lost', lost_reason: 'not_interested', updated_at: now })
    .eq('id', leadId);
  result.leadStatusChanged = 'lost';

  // Stop active sequence enrollments
  const stopped = await stopActiveEnrollments(supabase, leadId, now);
  result.sequenceStopped = stopped;
}

async function handleNoAnswer(
  supabase: SupabaseClient,
  activity: Record<string, unknown>,
  result: DispositionResult,
  now: string,
) {
  const leadId = activity.lead_id as string | null;
  if (!leadId) return;

  // Count previous no_answer outcomes for this lead
  const { count } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('lead_id', leadId)
    .eq('outcome', 'no_answer');

  const noAnswerCount = count ?? 0;

  if (noAnswerCount >= 3) {
    // Max attempts reached — mark lead as cold/lost
    await supabase
      .from('leads')
      .update({ status: 'lost', lost_reason: 'no_answer_cold', updated_at: now })
      .eq('id', leadId);
    result.leadStatusChanged = 'lost';

    const stopped = await stopActiveEnrollments(supabase, leadId, now);
    result.sequenceStopped = stopped;
  } else {
    // Create retry task in 2 days
    const dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() + 2);

    const title = activity.title as string;
    const { data: retry } = await supabase
      .from('activities')
      .insert({
        org_id: activity.org_id,
        activity_type: 'task',
        title: `Retry: ${title}`,
        lead_id: activity.lead_id,
        contact_id: activity.contact_id,
        owner_user_id: activity.owner_user_id,
        due_at: dueAt.toISOString(),
        details: `Attempt ${noAnswerCount + 1} of 3 — no answer`,
      })
      .select('id')
      .single();

    if (retry) {
      result.followUpCreated = true;
      result.followUpActivityId = retry.id;
    }
  }
}

async function stopActiveEnrollments(
  supabase: SupabaseClient,
  leadId: string,
  now: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('sequence_enrollments')
    .update({ status: 'stopped', updated_at: now })
    .eq('lead_id', leadId)
    .eq('status', 'active')
    .select('id');

  return (data?.length ?? 0) > 0;
}
