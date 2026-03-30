import * as Sentry from '@sentry/nextjs';
import type { SupabaseClient } from '@supabase/supabase-js';

import { wrapEmail } from '@/lib/email/templates/shared';
import { logger } from '@/lib/logger';

import { maybePromoteToContacted } from './auto-contacted';
import type { ProcessorOptions } from './sequence-processor';

export interface EmailStepParams {
  supabase: SupabaseClient;
  enrollment: Record<string, unknown>;
  step: Record<string, unknown>;
  actionConfig: Record<string, unknown>;
  now: string;
  options: ProcessorOptions;
}

interface RenderedEmail {
  subject: string;
  html: string;
  text?: string;
}

async function resolveEmailContent(
  enrollment: Record<string, unknown>,
  actionConfig: Record<string, unknown>,
  options: ProcessorOptions,
  outreachEventId?: string,
): Promise<RenderedEmail> {
  const defaultContent: RenderedEmail = {
    subject: (actionConfig.subject as string) ?? 'Automated sequence email',
    html: (actionConfig.body as string) ?? '',
  };
  const templateId = actionConfig.template_id as string | undefined;
  if (!templateId || !options.templateResolver) return defaultContent;

  const contact = (enrollment.contacts ?? {}) as Record<string, unknown>;
  const lead = (enrollment.leads ?? {}) as Record<string, unknown>;
  const rendered = await options.templateResolver.resolve(
    templateId,
    {
      first_name: (contact.first_name as string) ?? '',
      last_name: (contact.last_name as string) ?? '',
      company_name: (lead.company_name as string) ?? '',
      full_name: [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '',
      city: (lead.city as string) ?? '',
      province: (lead.province as string) ?? '',
    },
    outreachEventId,
  );
  return rendered ?? defaultContent;
}

function resolveOutcome(sendResult: { success: boolean; error?: string } | undefined): string {
  if (sendResult === undefined) return 'skipped';
  if (sendResult.error === 'email_sender_not_configured' || sendResult.error === 'no_contact_email')
    return 'skipped';
  if (sendResult.success === false) return 'failed';
  if (sendResult.success) return 'sent';
  return 'pending';
}

interface SequenceEmailContent {
  subject: string;
  html: string;
  text: string | undefined;
}

async function sendSequenceEmail(
  enrollment: Record<string, unknown>,
  options: ProcessorOptions,
  content: SequenceEmailContent,
): Promise<{ success: boolean; error?: string } | undefined> {
  const { subject, html, text } = content;
  const contactEmail = ((enrollment.contacts ?? {}) as Record<string, unknown>).email as
    | string
    | undefined;

  if (!options.emailSender) {
    return { success: false, error: 'email_sender_not_configured' };
  }

  if (!contactEmail) {
    logger.warn('Sequence email skipped: no contact email', {
      enrollmentId: enrollment.id,
      leadId: enrollment.lead_id,
    });
    return { success: false, error: 'no_contact_email' };
  }

  return options.emailSender.send({
    to: contactEmail,
    subject,
    html,
    text,
    enrollmentId: enrollment.id as string,
    leadId: enrollment.lead_id as string,
  });
}

/**
 * Executes an email step using the create-before-send pattern:
 * 1. Create outreach record with 'pending' outcome
 * 2. Resolve + brand-wrap email content (with tracking pixel using outreach ID)
 * 3. Send email via EmailSender
 * 4. Update outreach outcome to 'sent' or 'failed'
 */
export async function executeEmailStep(params: EmailStepParams): Promise<void> {
  const { supabase, enrollment, step, actionConfig, now, options } = params;

  // 1. Create outreach record FIRST to get an ID for tracking
  const outreachPayload = {
    lead_id: enrollment.lead_id,
    contact_id: enrollment.contact_id ?? null,
    channel: 'email',
    direction: 'outbound',
    subject: (actionConfig.subject as string) ?? 'Automated sequence email',
    message_preview: null as string | null,
    sequence_id: enrollment.sequence_id,
    sequence_step: step.step_number,
    is_automated: true,
    occurred_at: now,
    outcome: 'pending',
  };

  const { data: outreachRecord, error: insertError } = await supabase
    .from('outreach')
    .insert(outreachPayload)
    .select('id')
    .single();

  if (insertError || !outreachRecord) {
    throw new Error(
      `Failed to create outreach event: ${insertError?.message ?? 'no data returned'}`,
    );
  }

  const outreachId = (outreachRecord as Record<string, unknown>).id as string;

  // 2. Resolve email content (template resolver adds tracking pixel + wraps links)
  const {
    subject,
    html: rawHtml,
    text,
  } = await resolveEmailContent(enrollment, actionConfig, options, outreachId);

  // 3. Wrap in branded email template (header + footer + responsive layout)
  const html = wrapEmail(rawHtml);

  // Update outreach with resolved subject and preview (non-critical — log but don't throw)
  const { error: previewUpdateError } = await supabase
    .from('outreach')
    .update({
      subject,
      message_preview: html.substring(0, 500) || null,
    })
    .eq('id', outreachId);

  if (previewUpdateError) {
    logger.warn('Failed to update outreach subject/preview (non-critical)', {
      outreachId,
      error: previewUpdateError.message,
    });
  }

  // 4. Send email
  const sendResult = await sendSequenceEmail(enrollment, options, { subject, html, text });

  // 5. Update outreach outcome
  const outcome = resolveOutcome(sendResult);
  const { error: updateError } = await supabase
    .from('outreach')
    .update({ outcome, outcome_detail: sendResult?.error ?? null })
    .eq('id', outreachId);

  if (updateError) {
    const err = new Error(`Failed to update outreach outcome: ${updateError.message}`);
    logger.error('Failed to update outreach outcome', { outreachId, error: updateError.message });
    Sentry.captureException(err, { extra: { outreachId } });
    throw err;
  }

  // Auto-promote lead to "contacted" on first successful outreach
  if (outcome === 'sent') {
    await maybePromoteToContacted(enrollment.lead_id as string, supabase);
  }
}
