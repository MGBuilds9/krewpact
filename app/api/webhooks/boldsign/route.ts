/**
 * BoldSign webhook receiver.
 *
 * Handles e-sign lifecycle events:
 *   - Completed: all signers signed -> download PDF, store, update contract
 *   - Declined: a signer declined
 *   - Expired: envelope expired
 *   - Other events: update status and log
 *
 * Auth: HMAC-SHA256 signature verification via x-boldsign-signature header.
 * Uses service client (bypasses RLS) since webhooks are system-level.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { logger } from '@/lib/logger';
import { createServiceClient } from '@/lib/supabase/server';

import {
  type BoldSignWebhookEvent,
  handleCompleted,
  handleDeclined,
  handleExpired,
  handleGenericEvent,
} from './boldsign-handlers';

function verifyBoldSignSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const hmac = createHmac('sha256', secret);
  hmac.update(payload);
  const expected = hmac.digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

export const POST = withApiRoute({ auth: 'public', rateLimit: false }, async ({ req }) => {
  const rawBody = await req.text();

  const signature = req.headers.get('x-boldsign-signature') ?? '';
  const webhookSecret = process.env.BOLDSIGN_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.warn('BOLDSIGN_WEBHOOK_SECRET not set — accepting as verification ping');
    return NextResponse.json({ message: 'Webhook endpoint active' });
  }

  if (signature && !verifyBoldSignSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event: BoldSignWebhookEvent;
  try {
    event = JSON.parse(rawBody) as BoldSignWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const documentId = event.documentId;
  if (!documentId) {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const eventType = event.event ?? event.status ?? 'unknown';

  try {
    switch (eventType) {
      case 'Completed':
        await handleCompleted(documentId, event, supabase);
        break;
      case 'Declined':
        await handleDeclined(documentId, event, supabase);
        break;
      case 'Expired':
        await handleExpired(documentId, event, supabase);
        break;
      default:
        await handleGenericEvent(documentId, event, supabase);
        break;
    }
  } catch (err) {
    logger.error('BoldSign webhook: unhandled error', {
      documentId,
      eventType,
      error: err instanceof Error ? err.message : String(err),
    });
    // Still return 200 to prevent BoldSign from retrying
  }

  return NextResponse.json({ received: true });
});
