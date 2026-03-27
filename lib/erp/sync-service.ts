/**
 * ERP Sync Service — orchestrates syncing KrewPact entities to ERPNext.
 * Supports mock mode (no real ERPNext) and real mode (via ErpClient).
 *
 * Sync flow:
 * 1. Create erp_sync_jobs record (status=queued)
 * 2. Fetch entity from Supabase
 * 3. Call ERPNext API (or mock)
 * 4. Update job status (succeeded/failed)
 * 5. Create erp_sync_map entry linking local ID to ERPNext docname
 * 6. Log erp_sync_events
 *
 * Entity handlers live in ./sync-handlers/ — one file per entity group.
 */

import { logger } from '@/lib/logger';
import { createScopedServiceClient } from '@/lib/supabase/server';

import { syncChangeOrder } from './sync-handlers/sync-change-order';
import { syncContact } from './sync-handlers/sync-contact';
import { syncAccount } from './sync-handlers/sync-customer';
import { syncExpenseClaim } from './sync-handlers/sync-expense';
import { syncGoodsReceipt } from './sync-handlers/sync-goods-receipt';
import type { SyncJobContext } from './sync-handlers/sync-helpers';
import { syncInventoryPo } from './sync-handlers/sync-inventory-po';
import {
  readPaymentEntry,
  readPurchaseInvoice,
  readSalesInvoice,
} from './sync-handlers/sync-invoices';
import { syncMaterialCost } from './sync-handlers/sync-material-cost';
import { syncOpportunity, syncWonDeal } from './sync-handlers/sync-opportunity';
import { syncProject } from './sync-handlers/sync-project';
import { syncEstimate } from './sync-handlers/sync-quotation';
import { syncSupplier } from './sync-handlers/sync-supplier';
import { syncTask } from './sync-handlers/sync-task';
import { syncTimesheet } from './sync-handlers/sync-timesheet';
// TODO: import { syncRfqPackage } from './sync-handlers/sync-rfq'; — create when handler is ready
// TODO: import { syncBid } from './sync-handlers/sync-bid'; — create when handler is ready

// Re-export shared type so existing consumers don't break
export type { SyncResult } from './sync-handlers/sync-helpers';

/** Check if we're running in mock mode (no real ERPNext) */
export function isMockMode(): boolean {
  const mock = !process.env.ERPNEXT_BASE_URL || process.env.ERPNEXT_BASE_URL === 'mock';
  if (mock) {
    logger.warn('ERPNext mock mode active — no data will be synced to ERPNext');
    if (process.env.NODE_ENV === 'production') {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureMessage('CRITICAL: ERPNext mock mode active in production', {
          level: 'error',
        });
      });
    }
  }
  return mock;
}

export class SyncService {
  async syncAccount(accountId: string, userId: string, jobContext?: SyncJobContext) {
    return syncAccount(accountId, userId, jobContext);
  }

  async syncEstimate(estimateId: string, userId: string, jobContext?: SyncJobContext) {
    return syncEstimate(estimateId, userId, jobContext);
  }

  async syncOpportunity(opportunityId: string, userId: string, jobContext?: SyncJobContext) {
    return syncOpportunity(opportunityId, userId, jobContext);
  }

  async syncWonDeal(
    opportunityId: string,
    userId: string,
    wonDate: string,
    jobContext?: SyncJobContext,
  ) {
    return syncWonDeal(opportunityId, userId, wonDate, jobContext);
  }

  async syncContact(contactId: string, userId: string, jobContext?: SyncJobContext) {
    return syncContact(contactId, userId, jobContext);
  }

  async syncProject(projectId: string, userId: string, jobContext?: SyncJobContext) {
    return syncProject(projectId, userId, jobContext);
  }

  async syncTask(taskId: string, userId: string, jobContext?: SyncJobContext) {
    return syncTask(taskId, userId, jobContext);
  }

  async syncSupplier(portalAccountId: string, userId: string, jobContext?: SyncJobContext) {
    return syncSupplier(portalAccountId, userId, jobContext);
  }

  async syncExpenseClaim(expenseClaimId: string, userId: string, jobContext?: SyncJobContext) {
    return syncExpenseClaim(expenseClaimId, userId, jobContext);
  }

  async syncTimesheet(timesheetBatchId: string, userId: string, jobContext?: SyncJobContext) {
    return syncTimesheet(timesheetBatchId, userId, jobContext);
  }

  async syncInventoryPo(poId: string, userId: string, jobContext?: SyncJobContext) {
    return syncInventoryPo(poId, userId, jobContext);
  }

  async syncGoodsReceipt(grId: string, userId: string, jobContext?: SyncJobContext) {
    return syncGoodsReceipt(grId, userId, jobContext);
  }

  async syncChangeOrder(coId: string, userId: string, jobContext?: SyncJobContext) {
    return syncChangeOrder(coId, userId, jobContext);
  }

  async syncMaterialCost(
    options: { projectId: string; startDate: string; endDate: string },
    userId: string,
    jobContext?: SyncJobContext,
  ) {
    return syncMaterialCost(options, userId, jobContext);
  }

  async readSalesInvoice(erpDocname: string, jobContext?: SyncJobContext) {
    return readSalesInvoice(erpDocname, jobContext);
  }

  async readPurchaseInvoice(erpDocname: string, jobContext?: SyncJobContext) {
    return readPurchaseInvoice(erpDocname, jobContext);
  }

  async readPaymentEntry(erpDocname: string, jobContext?: SyncJobContext) {
    return readPaymentEntry(erpDocname, jobContext);
  }

  async syncRfqPackage(rfqId: string, _userId: string, _jobContext?: SyncJobContext) {
    // TODO: Wire to sync-handlers/sync-rfq.ts when handler is created
    void rfqId;
    throw new Error('RFQ sync handler not yet implemented');
  }

  async syncBid(bidId: string, _userId: string, _jobContext?: SyncJobContext) {
    // TODO: Wire to sync-handlers/sync-bid.ts when handler is created
    void bidId;
    throw new Error('Bid sync handler not yet implemented');
  }

  async syncAward(awardId: string, _userId: string, _jobContext?: SyncJobContext) {
    // TODO: Wire to sync-handlers/sync-award.ts when handler is created
    void awardId;
    throw new Error('Award sync handler not yet implemented');
  }

  async syncComplianceDoc(docId: string, _userId: string, _jobContext?: SyncJobContext) {
    // TODO: Wire to sync-handlers/sync-compliance-doc.ts when handler is created
    void docId;
    throw new Error('Compliance doc sync handler not yet implemented');
  }

  async syncSelectionSheet(sheetId: string, _userId: string, _jobContext?: SyncJobContext) {
    // TODO: Wire to sync-handlers/sync-selection-sheet.ts when handler is created
    void sheetId;
    throw new Error('Selection sheet sync handler not yet implemented');
  }

  async getSyncStatus(
    entityType: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    const supabase = createScopedServiceClient('erp-sync:get-status');
    const { data } = await supabase
      .from('erp_sync_map')
      .select('*')
      .eq('entity_type', entityType)
      .eq('local_id', entityId)
      .maybeSingle();
    return data as Record<string, unknown> | null;
  }
}
