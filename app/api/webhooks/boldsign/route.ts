import { createUserClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

function verifyBoldSignSignature(payload: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expected = hmac.digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.BOLDSIGN_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('BOLDSIGN_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('x-boldsign-signature') ?? '';

  if (!verifyBoldSignSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const envelopeId = event['envelopeId'] as string | undefined;
  const eventType = event['event'] as string | undefined;
  const status = event['status'] as string | undefined;

  if (!envelopeId) {
    return NextResponse.json({ error: 'Missing envelopeId' }, { status: 400 });
  }

  const supabase = await createUserClient();

  const updatePayload: Record<string, unknown> = {
    webhook_last_event_at: new Date().toISOString(),
    payload: event,
  };

  if (status) updatePayload['status'] = status;
  if (envelopeId) updatePayload['provider_envelope_id'] = envelopeId;

  const { error } = await supabase
    .from('esign_envelopes')
    .update(updatePayload)
    .eq('provider_envelope_id', envelopeId);

  if (error) {
    console.error('BoldSign webhook DB update failed:', error.message, { envelopeId, eventType });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
