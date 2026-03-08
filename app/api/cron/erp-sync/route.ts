import { NextRequest, NextResponse } from 'next/server';
import { SyncService } from '@/lib/erp/sync-service';
import { ErpClient } from '@/lib/erp/client';
import { isMockMode } from '@/lib/erp/sync-service';
import { verifyCronAuth } from '@/lib/api/cron-auth';
import { logger } from '@/lib/logger';

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
  const { authorized } = await verifyCronAuth(request);
  if (!authorized) {
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
          logger.error('Sales Invoice sync failed', { invoice: invoice.name, error: msg });
          summary.errors.push(msg);
        }
      }
    } catch (err) {
      const msg = `Failed to list Sales Invoices: ${err instanceof Error ? err.message : String(err)}`;
      logger.error('Failed to list Sales Invoices', { error: msg });
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
          logger.error('Purchase Invoice sync failed', { invoice: invoice.name, error: msg });
          summary.errors.push(msg);
        }
      }
    } catch (err) {
      const msg = `Failed to list Purchase Invoices: ${err instanceof Error ? err.message : String(err)}`;
      logger.error('Failed to list Purchase Invoices', { error: msg });
      summary.errors.push(msg);
    }
  } catch (err) {
    const msg = `Cron sync failed: ${err instanceof Error ? err.message : String(err)}`;
    logger.error('ERP cron sync failed', { error: msg });
    summary.errors.push(msg);
  }

  summary.completed_at = new Date().toISOString();

  logger.info('ERP cron sync completed', {
    invoices_synced: summary.invoices_synced,
    pos_synced: summary.pos_synced,
    error_count: summary.errors.length,
  });

  return NextResponse.json(summary);
}
