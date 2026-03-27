import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import {
  buildGraphUrl,
  getMicrosoftToken,
  graphErrorResponse,
  graphFetch,
} from '@/lib/microsoft/graph';
import type { SendMessagePayload } from '@/lib/microsoft/types';
import { createUserClientSafe } from '@/lib/supabase/server';
import { type SendEmail,sendEmailSchema } from '@/lib/validators/email';

export const POST = withApiRoute({ bodySchema: sendEmailSchema }, async ({ body, userId }) => {
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
  } = body as SendEmail;

  try {
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
      if (authError) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

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
  } catch (error) {
    const response = graphErrorResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
});
