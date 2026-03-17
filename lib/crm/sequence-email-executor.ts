import type { SupabaseClient } from '@supabase/supabase-js';

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
): Promise<RenderedEmail> {
  const defaultContent: RenderedEmail = {
    subject: (actionConfig.subject as string) ?? 'Automated sequence email',
    html: (actionConfig.body as string) ?? '',
  };
  const templateId = actionConfig.template_id as string | undefined;
  if (!templateId || !options.templateResolver) return defaultContent;

  const contact = (enrollment.contacts ?? {}) as Record<string, unknown>;
  const lead = (enrollment.leads ?? {}) as Record<string, unknown>;
  const rendered = await options.templateResolver.resolve(templateId, {
    first_name: (contact.first_name as string) ?? '',
    last_name: (contact.last_name as string) ?? '',
    company_name: (lead.company_name as string) ?? '',
    full_name: (contact.full_name as string) ?? '',
  });
  return rendered ?? defaultContent;
}

/**
 * Executes an email step: creates outreach record + optionally sends via EmailSender.
 */
export async function executeEmailStep(params: EmailStepParams): Promise<void> {
  const { supabase, enrollment, step, actionConfig, now, options } = params;
  const { subject, html, text } = await resolveEmailContent(enrollment, actionConfig, options);

  let sendResult: { success: boolean; error?: string } | undefined;
  const contactEmail = ((enrollment.contacts ?? {}) as Record<string, unknown>).email as
    | string
    | undefined;
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

  const { error: outreachError } = await supabase.from('outreach').insert({
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
