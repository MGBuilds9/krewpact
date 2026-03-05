import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { SyncService } from '@/lib/erp/sync-service';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';

/**
 * POST /api/webhooks/erpnext — Receives ERPNext document event webhooks.
 *
 * ERPNext sends POST on document events (create, update, submit, cancel).
 * Auth: shared secret via x-webhook-secret header (ERPNEXT_WEBHOOK_SECRET env var).
 *
 * Supported doctypes:
 *   - Sales Invoice: syncs invoice snapshot into KrewPact
 *   - Purchase Invoice: syncs PO snapshot into KrewPact
 *   - Customer: logs event (future: bidirectional account sync)
 *   - Project: logs event (future: bidirectional project sync)
 */
export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, { limit: 100, window: '1 m', identifier: 'webhook:erpnext' });
  if (!rl.success) return rateLimitResponse(rl);

  // 1. Verify webhook secret
  const secret = process.env.ERPNEXT_WEBHOOK_SECRET;
  if (!secret) {
    logger.error('[erpnext-webhook] ERPNEXT_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const providedSecret = request.headers.get('x-webhook-secret');
  if (!providedSecret || providedSecret !== secret) {
    console.warn('[erpnext-webhook] Invalid or missing webhook secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse payload
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // ERPNext webhook payload typically has: doctype, name, event, doc (the document data)
  const doctype = (payload.doctype as string) || '';
  const docname = (payload.name as string) || '';
  const event = (payload.event as string) || 'unknown';

  console.log(`[erpnext-webhook] Received: doctype=${doctype} name=${docname} event=${event}`);

  // 3. Handle by doctype
  const service = new SyncService();
  const errors: string[] = [];

  try {
    switch (doctype) {
      case 'Sales Invoice': {
        if (!docname) {
          return NextResponse.json({ error: 'Missing document name' }, { status: 400 });
        }
        const result = await service.readSalesInvoice(docname);
        console.log(`[erpnext-webhook] Sales Invoice sync: ${result.status} (${docname})`);
        break;
      }

      case 'Purchase Invoice': {
        if (!docname) {
          return NextResponse.json({ error: 'Missing document name' }, { status: 400 });
        }
        const result = await service.readPurchaseInvoice(docname);
        console.log(`[erpnext-webhook] Purchase Invoice sync: ${result.status} (${docname})`);
        break;
      }

      case 'Customer': {
        // Future: bidirectional account sync
        console.log(
          `[erpnext-webhook] Customer event received: ${docname} (${event}) — logged, no action`,
        );
        break;
      }

      case 'Project': {
        // Future: bidirectional project sync
        console.log(
          `[erpnext-webhook] Project event received: ${docname} (${event}) — logged, no action`,
        );
        break;
      }

      default: {
        console.log(`[erpnext-webhook] Unhandled doctype: ${doctype} (${docname}, ${event})`);
        break;
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[erpnext-webhook] Error processing ${doctype}/${docname}:`, { error: message });
    errors.push(message);
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { received: true, doctype, name: docname, event, errors },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true, doctype, name: docname, event });
}
