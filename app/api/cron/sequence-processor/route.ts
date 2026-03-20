import { NextRequest, NextResponse } from 'next/server';

import { verifyCronAuth } from '@/lib/api/cron-auth';
import { createCronLogger } from '@/lib/api/cron-logger';
import type { EmailSender, TemplateResolver } from '@/lib/crm/sequence-processor';
import { processSequences } from '@/lib/crm/sequence-processor';
import { sendEmail } from '@/lib/email/resend';
import { renderEmailTemplate, type TrackingConfig } from '@/lib/email/template-renderer';
import { createServiceClient } from '@/lib/supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.krewpact.com';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { authorized } = await verifyCronAuth(req);
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const result = await processSequences(supabase, { emailSender, templateResolver });

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
}

// Vercel Cron Jobs sends GET requests
export { POST as GET };
