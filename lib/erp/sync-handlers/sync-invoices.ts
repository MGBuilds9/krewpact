/**
 * Sync handlers (inbound reads):
 *   ERPNext Sales Invoice → invoice_snapshots
 *   ERPNext Purchase Invoice → po_snapshots
 *   ERPNext Payment Entry → erp_sync_events
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import {
  mockPaymentEntryResponse,
  mockPurchaseInvoiceResponse,
  mockSalesInvoiceResponse,
} from '../mock-responses';
import { fromErpPaymentEntry } from '../payment-entry-mapper';
import { fromErpPurchaseInvoice } from '../purchase-invoice-mapper';
import { fromErpSalesInvoice } from '../sales-invoice-mapper';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
} from './sync-helpers';

export async function readSalesInvoice(
  erpDocname: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:read-sales-invoice');
  const job = await createSyncJob(supabase, 'sales_invoice', erpDocname, jobContext);

  try {
    let invoiceData: Record<string, unknown>;

    if (isMockMode()) {
      const mockResp = mockSalesInvoiceResponse(erpDocname);
      invoiceData = mockResp.data;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      invoiceData = await client.get<Record<string, unknown>>('Sales Invoice', erpDocname);
    }

    const snapshot = fromErpSalesInvoice(invoiceData);
    await supabase.from('invoice_snapshots').upsert(
      {
        erp_docname: erpDocname,
        invoice_number: (snapshot.erp_invoice_name as string) || erpDocname,
        customer_name: snapshot.customer_name as string,
        invoice_date: snapshot.posting_date as string | null,
        due_date: snapshot.due_date as string | null,
        status: snapshot.status as string,
        subtotal_amount: snapshot.grand_total as number,
        tax_amount: 0,
        total_amount: snapshot.grand_total as number,
        amount_paid: (snapshot.grand_total as number) - (snapshot.outstanding_amount as number),
        snapshot_payload: { ...snapshot, raw: invoiceData },
      },
      { onConflict: 'erp_docname' },
    );

    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'sales_invoice',
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'sales_invoice',
      entity_id: erpDocname,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'sales_invoice', erpDocname, message);
  }
}

export async function readPurchaseInvoice(
  erpDocname: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:read-purchase-invoice');
  const job = await createSyncJob(supabase, 'purchase_invoice', erpDocname, jobContext);

  try {
    let invoiceData: Record<string, unknown>;

    if (isMockMode()) {
      const mockResp = mockPurchaseInvoiceResponse(erpDocname);
      invoiceData = mockResp.data;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      invoiceData = await client.get<Record<string, unknown>>('Purchase Invoice', erpDocname);
    }

    const mapped = fromErpPurchaseInvoice(invoiceData);
    await supabase.from('po_snapshots').upsert(
      {
        erp_docname: erpDocname,
        po_number: (mapped.erp_invoice_name as string) || erpDocname,
        supplier_name: mapped.supplier_name as string,
        po_date: mapped.posting_date as string | null,
        status: mapped.status as string,
        subtotal_amount: mapped.grand_total as number,
        tax_amount: 0,
        total_amount: mapped.grand_total as number,
        snapshot_payload: { ...mapped, raw: invoiceData },
      },
      { onConflict: 'po_number' },
    );

    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'purchase_invoice',
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'purchase_invoice',
      entity_id: erpDocname,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'purchase_invoice', erpDocname, message);
  }
}

export async function readPaymentEntry(
  erpDocname: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:read-payment-entry');
  const job = await createSyncJob(supabase, 'payment_entry', erpDocname, jobContext);

  try {
    let paymentData: Record<string, unknown>;

    if (isMockMode()) {
      const mockResp = mockPaymentEntryResponse(erpDocname);
      paymentData = mockResp.data;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      paymentData = await client.get<Record<string, unknown>>('Payment Entry', erpDocname);
    }

    const mapped = fromErpPaymentEntry(paymentData);

    await supabase.from('erp_sync_events').insert({
      job_id: job.id,
      event_type: 'payment_entry_read',
      event_payload: mapped,
    });

    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'payment_entry',
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'payment_entry',
      entity_id: erpDocname,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'payment_entry', erpDocname, message);
  }
}
