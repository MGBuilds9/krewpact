import { NextRequest, NextResponse } from 'next/server';
import { SyncService } from '@/lib/erp/sync-service';
import { ErpClient } from '@/lib/erp/client';
import { isMockMode } from '@/lib/erp/sync-service';

/**
 * GET /api/cron/erp-sync — Periodic inbound sync of Sales Invoices and Purchase Invoices.
 *
 * Called by QStash cron or Vercel cron. Fetches recently modified invoices from ERPNext
 * and syncs them into KrewPact's snapshot tables.
 *
 * Auth: Bearer token via Authorization header (CRON_SECRET env var) or
 *       QStash signature verification via Upstash-Signature header.
 */
export async function GET(request: NextRequest) {
  // 1. Verify cron authorization
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const qstashSignature = request.headers.get('upstash-signature');

  // Accept either Bearer token or QStash signature
  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) || !!qstashSignature;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Determine sync window (last 24 hours)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19);

  const service = new SyncService();
  const summary = {
    invoices_synced: 0,
    pos_synced: 0,
    errors: [] as string[],
    started_at: new Date().toISOString(),
    completed_at: '',
  };

  try {
    if (isMockMode()) {
      // In mock mode, nothing to fetch — return empty summary
      summary.completed_at = new Date().toISOString();
      return NextResponse.json(summary);
    }

    const client = new ErpClient();

    // 3. Fetch recent Sales Invoices
    try {
      const salesInvoices = await client.list<{ name: string }>(
        'Sales Invoice',
        { modified: ['>', since] },
        [
          'name',
          'customer',
          'posting_date',
          'grand_total',
          'outstanding_amount',
          'status',
          'custom_mdm_project_id',
        ],
        100,
      );

      for (const invoice of salesInvoices) {
        try {
          await service.readSalesInvoice(invoice.name);
          summary.invoices_synced++;
        } catch (err) {
          const msg = `Sales Invoice ${invoice.name}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(`[erp-cron] ${msg}`);
          summary.errors.push(msg);
        }
      }
    } catch (err) {
      const msg = `Failed to list Sales Invoices: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[erp-cron] ${msg}`);
      summary.errors.push(msg);
    }

    // 4. Fetch recent Purchase Invoices
    try {
      const purchaseInvoices = await client.list<{ name: string }>(
        'Purchase Invoice',
        { modified: ['>', since] },
        [
          'name',
          'supplier',
          'posting_date',
          'grand_total',
          'outstanding_amount',
          'status',
          'custom_mdm_project_id',
        ],
        100,
      );

      for (const invoice of purchaseInvoices) {
        try {
          await service.readPurchaseInvoice(invoice.name);
          summary.pos_synced++;
        } catch (err) {
          const msg = `Purchase Invoice ${invoice.name}: ${err instanceof Error ? err.message : String(err)}`;
          console.error(`[erp-cron] ${msg}`);
          summary.errors.push(msg);
        }
      }
    } catch (err) {
      const msg = `Failed to list Purchase Invoices: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[erp-cron] ${msg}`);
      summary.errors.push(msg);
    }
  } catch (err) {
    const msg = `Cron sync failed: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`[erp-cron] ${msg}`);
    summary.errors.push(msg);
  }

  summary.completed_at = new Date().toISOString();

  console.log(
    `[erp-cron] Completed: ${summary.invoices_synced} invoices, ${summary.pos_synced} POs, ${summary.errors.length} errors`,
  );

  return NextResponse.json(summary);
}
