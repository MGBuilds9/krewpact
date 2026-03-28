/**
 * Resend email client for transactional outreach.
 */

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
}

interface SendEmailResult {
  id: string;
  success: boolean;
  error?: string;
}

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'KrewPact <noreply@updates.krewpact.com>';

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { id: '', success: false, error: 'RESEND_API_KEY not configured' };
  }

  const from = params.from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM;

  const testOverride = process.env.NODE_ENV !== 'production' ? process.env.ALERT_EMAIL : undefined;
  const recipient = testOverride ?? params.to;

  let res: Response;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: params.subject,
        html: params.html,
        text: params.text,
        reply_to: params.replyTo,
      }),
    });
  } catch (err) {
    return { id: '', success: false, error: String(err) };
  }

  if (!res.ok) {
    const text = await res.text();
    return { id: '', success: false, error: `Resend API error ${res.status}: ${text}` };
  }

  const data = await res.json();
  return { id: data.id, success: true };
}
