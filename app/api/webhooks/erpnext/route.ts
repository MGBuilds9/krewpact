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
  if (
    !provided ||
    provided.length !== secret.length ||
    !timingSafeEqual(Buffer.from(provided), Buffer.from(secret))
  ) {
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

  if (doctype === 'Sales Invoice') {
    const result = await service.readSalesInvoice(docname);
    logger.info('Sales Invoice sync complete', { status: result.status, docname, event });
    return null;
  }

  if (doctype === 'Purchase Invoice') {
    const result = await service.readPurchaseInvoice(docname);
    logger.info('Purchase Invoice sync complete', { status: result.status, docname, event });
    return null;
  }

  if (doctype === 'Customer' || doctype === 'Project') {
    logger.info(`${doctype} event received, no action`, { docname, event });
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
  logger.info('ERPNext webhook received', { doctype, docname, event });

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
