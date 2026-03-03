import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { renderEmailTemplate } from '@/lib/email/template-renderer';
import { processSequences } from '@/lib/crm/sequence-processor';
import type { EmailSender, TemplateResolver } from '@/lib/crm/sequence-processor';

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET ?? process.env.WEBHOOK_SIGNING_SECRET;
  if (!cronSecret) return false;
  return req.headers.get('authorization') === `Bearer ${cronSecret}`;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Wire real email sending via Resend
  const emailSender: EmailSender = {
    async send({ to, subject, html, text }) {
      const result = await sendEmail({ to, subject, html, text });
      return { success: result.success, error: result.error };
    },
  };

  // Wire template resolution from Supabase email_templates table
  const templateResolver: TemplateResolver = {
    async resolve(templateId, variables) {
      const { data: template } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (!template) return null;

      return renderEmailTemplate(template, variables);
    },
  };

  const result = await processSequences(supabase, { emailSender, templateResolver });

  return NextResponse.json({
    success: true,
    processed: result.processed,
    completed: result.completed,
    deadLettered: result.deadLettered,
    errors: result.errors.length,
    timestamp: new Date().toISOString(),
  });
}
