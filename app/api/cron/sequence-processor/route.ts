import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { renderEmailTemplate } from '@/lib/email/template-renderer';

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET ?? process.env.WEBHOOK_SIGNING_SECRET;
  if (!cronSecret) return false;
  return req.headers.get('authorization') === `Bearer ${cronSecret}`;
}

function msFromDaysAndHours(days: number, hours: number): number {
  return days * 86_400_000 + hours * 3_600_000;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: enrollments, error } = await supabase
    .from('sequence_enrollments')
    .select('*, sequences(*), leads(*), contacts(*)')
    .eq('status', 'active')
    .lte('next_step_at', new Date().toISOString())
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!enrollments || enrollments.length === 0) {
    return NextResponse.json({ success: true, processed: 0 });
  }

  let processed = 0;
  let errors = 0;

  for (const enrollment of enrollments) {
    try {
      const { data: step } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_number', enrollment.current_step + 1)
        .single();

      if (!step) {
        await supabase
          .from('sequence_enrollments')
          .update({ status: 'completed' })
          .eq('id', enrollment.id);
        processed++;
        continue;
      }

      const config = step.action_config as Record<string, unknown>;

      if (step.action_type === 'email') {
        const templateId = config.template_id as string | undefined;

        if (templateId) {
          const { data: template } = await supabase
            .from('email_templates')
            .select('*')
            .eq('id', templateId)
            .single();

          const contact = enrollment.contacts;
          const lead = enrollment.leads;
          const email = contact?.email;

          if (template && email) {
            const rendered = renderEmailTemplate(template, {
              first_name: contact?.first_name ?? '',
              last_name: contact?.last_name ?? '',
              company_name: lead?.company_name ?? '',
              full_name: contact?.full_name ?? '',
            });

            const result = await sendEmail({
              to: email,
              subject: rendered.subject,
              html: rendered.html,
              text: rendered.text,
            });

            await supabase.from('outreach').insert({
              lead_id: enrollment.lead_id,
              contact_id: enrollment.contact_id,
              channel: 'email',
              direction: 'outbound',
              subject: rendered.subject,
              is_automated: true,
              sequence_id: enrollment.sequence_id,
              sequence_step: step.step_number,
              outcome: result.success ? 'sent' : 'failed',
              outcome_detail: result.error ?? null,
            });
          }
        }
      }

      const { data: nextStep } = await supabase
        .from('sequence_steps')
        .select('delay_days, delay_hours')
        .eq('sequence_id', enrollment.sequence_id)
        .eq('step_number', step.step_number + 1)
        .single();

      const next_step_at = nextStep
        ? new Date(
            Date.now() +
              msFromDaysAndHours(nextStep.delay_days ?? 0, nextStep.delay_hours ?? 0),
          ).toISOString()
        : null;

      await supabase
        .from('sequence_enrollments')
        .update({
          current_step: step.step_number,
          next_step_at,
          status: nextStep ? 'active' : 'completed',
        })
        .eq('id', enrollment.id);

      processed++;
    } catch (err) {
      errors++;
      console.error(`Sequence processor error for enrollment ${enrollment.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    processed,
    errors,
    timestamp: new Date().toISOString(),
  });
}
