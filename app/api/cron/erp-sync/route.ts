/**
 * GET /api/cron/erp-sync — Periodic inbound sync of Sales Invoices and Purchase Invoices.
 *
 * Called by QStash cron or Vercel cron. Fetches recently modified invoices from ERPNext
 * and syncs them into KrewPact's snapshot tables.
 */

import { NextResponse } from 'next/server';

import { createCronLogger } from '@/lib/api/cron-logger';
import { withApiRoute } from '@/lib/api/with-api-route';
import { ErpClient } from '@/lib/erp/client';
import { isMockMode, SyncService } from '@/lib/erp/sync-service';
import { logger } from '@/lib/logger';

interface SyncSummary {
  invoices_synced: number;
  pos_synced: number;
  errors: string[];
  started_at: string;
  completed_at: string;
}

const SALES_INVOICE_FIELDS = [
  'name',
  'customer',
  'posting_date',
  'grand_total',
  'outstanding_amount',
  'status',
  'custom_mdm_project_id',
];

const PURCHASE_INVOICE_FIELDS = [
  'name',
  'supplier',
  'posting_date',
  'grand_total',
  'outstanding_amount',
  'status',
  'custom_mdm_project_id',
];

async function syncSalesInvoices(
  client: ErpClient,
  service: SyncService,
  since: string,
  summary: SyncSummary,
): Promise<void> {
  try {
    const invoices = await client.list<{ name: string }>(
      'Sales Invoice',
      { modified: ['>', since] },
      SALES_INVOICE_FIELDS,
      100,
    );
    for (const invoice of invoices) {
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
}

async function syncPurchaseInvoices(
  client: ErpClient,
  service: SyncService,
  since: string,
  summary: SyncSummary,
): Promise<void> {
  try {
    const invoices = await client.list<{ name: string }>(
      'Purchase Invoice',
      { modified: ['>', since] },
      PURCHASE_INVOICE_FIELDS,
      100,
    );
    for (const invoice of invoices) {
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
}

export const GET = withApiRoute({ auth: 'cron' }, async () => {
  const cronLog = createCronLogger('erp-sync');
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19);

  const summary: SyncSummary = {
    invoices_synced: 0,
    pos_synced: 0,
    errors: [],
    started_at: new Date().toISOString(),
    completed_at: '',
  };

  if (isMockMode()) {
    summary.completed_at = new Date().toISOString();
    return NextResponse.json(summary);
  }

  const client = new ErpClient();
  const service = new SyncService();
  await syncSalesInvoices(client, service, since, summary);
  await syncPurchaseInvoices(client, service, since, summary);

  summary.completed_at = new Date().toISOString();
  logger.info('ERP cron sync completed', {
    invoices_synced: summary.invoices_synced,
    pos_synced: summary.pos_synced,
    error_count: summary.errors.length,
  });

  if (summary.errors.length > 0 && summary.invoices_synced === 0 && summary.pos_synced === 0) {
    await cronLog.failure(new Error(`All sync failed: ${summary.errors[0]}`));
  } else {
    await cronLog.success({
      invoices_synced: summary.invoices_synced,
      pos_synced: summary.pos_synced,
      errors: summary.errors.length,
    });
  }

  return NextResponse.json(summary);
});
