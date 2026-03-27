import { NextResponse } from 'next/server';

import { createCronLogger } from '@/lib/api/cron-logger';
import { withApiRoute } from '@/lib/api/with-api-route';
import type { EmailSender, TemplateResolver } from '@/lib/crm/sequence-processor';
import { processSequences } from '@/lib/crm/sequence-processor';
import { sendEmail } from '@/lib/email/resend';
import { renderEmailTemplate, type TrackingConfig } from '@/lib/email/template-renderer';
import { dispatchNotification } from '@/lib/notifications/dispatcher';
import { createServiceClient } from '@/lib/supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.krewpact.com';

export const GET = withApiRoute({ auth: 'cron' }, async () => {
  const cronLog = createCronLogger('sequence-processor');
  const supabase = createServiceClient();

  // Wire real email sending via Resend
  const emailSender: EmailSender = {
    async send({ to, subject, html, text }) {
      const result = await sendEmail({ to, subject, html, text });
      return { success: result.success, error: result.error };
    },
  };

  // Wire template resolution from Supabase email_templates table
  // When outreachEventId is provided, injects open/click tracking into the HTML
  const templateResolver: TemplateResolver = {
    async resolve(templateId, variables, outreachEventId?) {
      const { data: template } = await supabase
        .from('email_templates')
        .select(
          'id, name, subject, body_html, body_text, category, division_id, is_active, variables, created_at, updated_at',
        )
        .eq('id', templateId)
        .single();

      if (!template) return null;

      const tracking: TrackingConfig | undefined = outreachEventId
        ? { outreachEventId, baseUrl: APP_URL }
        : undefined;

      return renderEmailTemplate(template, variables, tracking);
    },
  };

  const result = await processSequences(supabase, {
    emailSender,
    templateResolver,
    onTaskCreated: async (params) => {
      await dispatchNotification({
        type: 'sequence_task_created',
        assignee_email: params.assigneeEmail,
        assignee_name: params.assigneeName,
        task_title: params.taskTitle,
        lead_company: params.leadCompany,
        lead_id: params.leadId,
      });
    },
  });

  const response = {
    success: true,
    processed: result.processed,
    completed: result.completed,
    deadLettered: result.deadLettered,
    errors: result.errors.length,
    timestamp: new Date().toISOString(),
  };
  await cronLog.success({
    processed: result.processed,
    completed: result.completed,
    errors: result.errors.length,
  });
  return NextResponse.json(response);
});
