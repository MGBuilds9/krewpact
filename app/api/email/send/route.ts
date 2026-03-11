import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmailSchema } from '@/lib/validators/email';
import { getMicrosoftToken, graphFetch, buildGraphUrl } from '@/lib/microsoft/graph';
import { createUserClientSafe } from '@/lib/supabase/server';
import type { SendMessagePayload } from '@/lib/microsoft/types';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rl = await rateLimit(req, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = sendEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const {
    to,
    cc,
    subject,
    body: emailBody,
    bodyType,
    leadId,
    contactId,
    accountId,
    mailbox,
  } = parsed.data;

  const token = await getMicrosoftToken(userId);

  const payload: SendMessagePayload = {
    message: {
      subject,
      body: { contentType: bodyType, content: emailBody },
      toRecipients: to.map((r) => ({
        emailAddress: { name: r.name, address: r.address },
      })),
      ccRecipients: cc?.map((r) => ({
        emailAddress: { name: r.name, address: r.address },
      })),
    },
    saveToSentItems: true,
  };

  const url = buildGraphUrl('/sendMail', mailbox);

  await graphFetch(token, url, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (leadId || contactId || accountId) {
    const recipients = to.map((r) => r.address).join(', ');
    const { client: supabase, error: authError } = await createUserClientSafe();
    if (authError) return authError;

    await supabase.from('activities').insert({
      activity_type: 'email',
      title: `Email: ${subject}`,
      details: `Sent to: ${recipients}`,
      lead_id: leadId ?? null,
      contact_id: contactId ?? null,
      account_id: accountId ?? null,
      completed_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
