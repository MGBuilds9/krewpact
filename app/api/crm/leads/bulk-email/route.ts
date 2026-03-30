import { NextResponse } from 'next/server';
import { z } from 'zod';

import { dbError } from '@/lib/api/errors';
import { withApiRoute } from '@/lib/api/with-api-route';
import { maybePromoteToContacted } from '@/lib/crm/auto-contacted';
import { sendEmail } from '@/lib/email/resend';
import { createUserClientSafe } from '@/lib/supabase/server';

const bulkEmailSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1).max(50),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  text: z.string().optional(),
  template_id: z.string().uuid().optional(),
});

type SupabaseClient = NonNullable<Awaited<ReturnType<typeof createUserClientSafe>>['client']>;

interface Contact {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  lead_id: string | null;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string | undefined;
}

function personalizeTemplate(template: string, contact: Contact): string {
  return template
    .replace(/{{first_name}}/g, contact.first_name ?? '')
    .replace(/{{last_name}}/g, contact.last_name ?? '')
    .replace(/{{email}}/g, contact.email ?? '');
}

async function sendToContact(
  supabase: SupabaseClient,
  contact: Contact,
  emailTemplate: EmailTemplate,
): Promise<{ contact_id: string; email: string; success: boolean; error?: string }> {
  const { subject, html, text } = emailTemplate;
  const result = await sendEmail({
    to: contact.email!,
    subject,
    html: personalizeTemplate(html, contact),
    text: text ? personalizeTemplate(text, contact) : undefined,
  });

  if (result.success) {
    await supabase.from('outreach').insert({
      lead_id: contact.lead_id,
      contact_id: contact.id,
      channel: 'email',
      direction: 'outbound',
      activity_type: 'bulk_email',
      outcome: 'sent',
      occurred_at: new Date().toISOString(),
    });
  }

  return {
    contact_id: contact.id,
    email: contact.email!,
    success: result.success,
    error: result.error,
  };
}

export const POST = withApiRoute(
  { bodySchema: bulkEmailSchema, rateLimit: { limit: 10, window: '1 m' } },
  async ({ body }) => {
    const { lead_ids, subject, html, text } = body as z.infer<typeof bulkEmailSchema>;
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, first_name, last_name, lead_id')
      .in('lead_id', lead_ids)
      .not('email', 'is', null);

    if (contactError) throw dbError(contactError.message);
    if (!contacts || contacts.length === 0)
      return NextResponse.json(
        { error: 'No contacts with email found for selected leads' },
        { status: 400 },
      );

    const seen = new Set<string>();
    const uniqueContacts = contacts.filter((c) => {
      if (!c.email || seen.has(c.email)) return false;
      seen.add(c.email);
      return true;
    });

    const results = await Promise.all(
      uniqueContacts.map((c) => sendToContact(supabase, c as Contact, { subject, html, text })),
    );
    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    // Auto-promote leads that received their first outreach
    const sentLeadIds = new Set(
      results.filter((r) => r.success).map((r) => {
        const contact = uniqueContacts.find((c) => c.id === r.contact_id);
        return contact?.lead_id;
      }).filter(Boolean) as string[],
    );
    await Promise.all(
      [...sentLeadIds].map((id) => maybePromoteToContacted(id, supabase)),
    );

    return NextResponse.json({ sent, failed, total: results.length, results });
  },
);
