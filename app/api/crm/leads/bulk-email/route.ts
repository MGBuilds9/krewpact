import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/resend';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

const bulkEmailSchema = z.object({
  lead_ids: z.array(z.string().uuid()).min(1).max(50),
  subject: z.string().min(1).max(200),
  html: z.string().min(1),
  text: z.string().optional(),
  template_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 10, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = bulkEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { lead_ids, subject, html, text } = parsed.data;
  const { client: supabase, error: authError } = await createUserClientSafe();
  if (authError) return authError;

  // Fetch leads with email contacts
  const { data: contacts, error: contactError } = await supabase
    .from('contacts')
    .select('id, email, first_name, last_name, lead_id')
    .in('lead_id', lead_ids)
    .not('email', 'is', null);

  if (contactError) {
    return NextResponse.json({ error: contactError.message }, { status: 500 });
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json(
      { error: 'No contacts with email found for selected leads' },
      { status: 400 },
    );
  }

  // Dedupe by email
  const seen = new Set<string>();
  const uniqueContacts = contacts.filter((c) => {
    if (!c.email || seen.has(c.email)) return false;
    seen.add(c.email);
    return true;
  });

  const results: Array<{ contact_id: string; email: string; success: boolean; error?: string }> =
    [];

  for (const contact of uniqueContacts) {
    const personalizedHtml = html
      .replace(/{{first_name}}/g, contact.first_name ?? '')
      .replace(/{{last_name}}/g, contact.last_name ?? '')
      .replace(/{{email}}/g, contact.email ?? '');

    const personalizedText = text
      ?.replace(/{{first_name}}/g, contact.first_name ?? '')
      .replace(/{{last_name}}/g, contact.last_name ?? '')
      .replace(/{{email}}/g, contact.email ?? '');

    const result = await sendEmail({
      to: contact.email!,
      subject,
      html: personalizedHtml,
      text: personalizedText,
    });

    results.push({
      contact_id: contact.id,
      email: contact.email!,
      success: result.success,
      error: result.error,
    });

    // Log outreach event
    if (result.success) {
      await supabase.from('outreach_events').insert({
        lead_id: contact.lead_id,
        contact_id: contact.id,
        channel: 'email',
        direction: 'outbound',
        activity_type: 'bulk_email',
        outcome: 'sent',
        occurred_at: new Date().toISOString(),
      });
    }
  }

  const sent = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return NextResponse.json({ sent, failed, total: results.length, results });
}
