import { Redis } from '@upstash/redis';
import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { withApiRoute } from '@/lib/api/with-api-route';
import { SyncService } from '@/lib/erp/sync-service';
import { logger } from '@/lib/logger';

/**
 * POST /api/webhooks/erpnext — Receives ERPNext document event webhooks.
 *
 * ERPNext sends POST on document events (create, update, submit, cancel).
 * Auth: shared secret via x-webhook-secret header (ERPNEXT_WEBHOOK_SECRET env var).
 */

function verifyWebhookSecret(request: NextRequest): NextResponse | null {
  const secret = process.env.ERPNEXT_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('[erpnext-webhook] ERPNEXT_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }
  const provided = request.headers.get('x-webhook-secret');
  if (!provided) {
    logger.warn('[erpnext-webhook] Invalid or missing webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const providedBuf = Buffer.from(provided);
  const secretBuf = Buffer.from(secret);

  if (providedBuf.byteLength !== secretBuf.byteLength || !timingSafeEqual(providedBuf, secretBuf)) {
    logger.warn('[erpnext-webhook] Invalid or missing webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

async function dispatchDoctype(
  service: SyncService,
  doctype: string,
  docname: string,
  event: string,
): Promise<NextResponse | null> {
  if (!docname) return NextResponse.json({ error: 'Missing document name' }, { status: 400 });

  // Read-only inbound sync (ERPNext → KrewPact)
  const readHandlers: Record<string, (name: string) => Promise<unknown>> = {
    'Sales Invoice': (name) => service.readSalesInvoice(name),
    'Purchase Invoice': (name) => service.readPurchaseInvoice(name),
  };

  // Bidirectional sync (ERPNext change triggers KrewPact update)
  const syncHandlers: Record<string, (name: string) => Promise<unknown>> = {
    'Payment Entry': (name) => service.syncPaymentEntry(name, 'webhook'),
    'Stock Entry': (name) => service.syncStockEntry(name, 'webhook'),
    Employee: (name) => service.syncEmployee(name, 'webhook'),
  };

  const readHandler = readHandlers[doctype];
  if (readHandler) {
    const result = await readHandler(docname);
    logger.info(`${doctype} inbound sync complete`, { docname, event, result });
    return null;
  }

  const syncHandler = syncHandlers[doctype];
  if (syncHandler) {
    const result = await syncHandler(docname);
    logger.info(`${doctype} bidirectional sync complete`, { docname, event, result });
    return null;
  }

  // Known outbound-only doctypes — we receive events but don't need to process inbound
  const outboundOnly = ['Customer', 'Project', 'Supplier', 'Item', 'Quotation'];
  if (outboundOnly.includes(doctype)) {
    logger.info(`${doctype} event received — outbound-only, no inbound action`, { docname, event });
    return null;
  }

  logger.warn('Unhandled ERPNext doctype', { doctype, docname, event });
  return null;
}

export const POST = withApiRoute({ auth: 'public', rateLimit: false }, async ({ req }) => {
  const secretError = verifyWebhookSecret(req);
  if (secretError) return secretError;

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const doctype = (payload.doctype as string) || '';
  const docname = (payload.name as string) || '';
  const event = (payload.event as string) || 'unknown';
  const modified = (payload.modified as string) || '';
  logger.info('ERPNext webhook received', { doctype, docname, event });

  // Replay protection: dedup using Redis SET NX with 5-min TTL.
  // Fails open if Redis is unavailable (same pattern as rate limiting).
  const dedupKey = `erpnext-webhook:${doctype}:${docname}:${modified}`;
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      const redis = new Redis({ url, token });
      const isNew = await redis.set(dedupKey, '1', { nx: true, ex: 300 });
      if (!isNew) {
        logger.info('Duplicate ERPNext webhook — skipping', { dedupKey });
        return NextResponse.json({ received: true, deduplicated: true });
      }
    }
  } catch {
    logger.warn('Redis dedup check failed — processing anyway', { dedupKey });
  }

  const service = new SyncService();

  try {
    const earlyReturn = await dispatchDoctype(service, doctype, docname, event);
    if (earlyReturn) return earlyReturn;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[erpnext-webhook] Error processing ${doctype}/${docname}:`, { error: message });
    return NextResponse.json(
      { received: true, doctype, name: docname, event, errors: [message] },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true, doctype, name: docname, event });
});
