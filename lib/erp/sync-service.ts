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

import { syncAttendance } from './sync-handlers/sync-attendance';
import { syncAward } from './sync-handlers/sync-award';
import { syncBankAccount } from './sync-handlers/sync-bank-account';
import { syncBatch } from './sync-handlers/sync-batch';
import { syncBid } from './sync-handlers/sync-bid';
import { syncBom } from './sync-handlers/sync-bom';
import { syncBudget } from './sync-handlers/sync-budget';
import { syncChangeOrder } from './sync-handlers/sync-change-order';
import { syncCompany } from './sync-handlers/sync-company';
import { syncComplianceDoc } from './sync-handlers/sync-compliance-doc';
import { syncContact } from './sync-handlers/sync-contact';
import { syncCostCenter } from './sync-handlers/sync-cost-center';
import { syncAccount } from './sync-handlers/sync-customer';
import { syncDepartment } from './sync-handlers/sync-department';
import { syncEmployee } from './sync-handlers/sync-employee';
import { syncExpenseClaim } from './sync-handlers/sync-expense';
import { readGlEntry } from './sync-handlers/sync-gl-entry';
import { syncGoodsReceipt } from './sync-handlers/sync-goods-receipt';
import type { SyncJobContext } from './sync-handlers/sync-helpers';
import { syncHolidayList } from './sync-handlers/sync-holiday-list';
import { syncHrSettings } from './sync-handlers/sync-hr-settings';
import { syncInventoryPo } from './sync-handlers/sync-inventory-po';
import {
  readPaymentEntry,
  readPurchaseInvoice,
  readSalesInvoice,
} from './sync-handlers/sync-invoices';
import { syncItem } from './sync-handlers/sync-item';
import { syncItemPrice } from './sync-handlers/sync-item-price';
import { syncJournalEntry } from './sync-handlers/sync-journal-entry';
import { syncLeaveApplication } from './sync-handlers/sync-leave-application';
import { syncMaterialCost } from './sync-handlers/sync-material-cost';
import { syncMaterialRequest } from './sync-handlers/sync-material-request';
import { readModeOfPayment } from './sync-handlers/sync-mode-of-payment';
import { syncOpportunity, syncWonDeal } from './sync-handlers/sync-opportunity';
import { syncPaymentEntry } from './sync-handlers/sync-payment-entry';
import { syncPriceList } from './sync-handlers/sync-price-list';
import { syncProject } from './sync-handlers/sync-project';
import { syncQualityInspection } from './sync-handlers/sync-quality-inspection';
import { syncEstimate } from './sync-handlers/sync-quotation';
import { syncRequestForQuotation } from './sync-handlers/sync-request-for-quotation';
import { syncRfqPackage } from './sync-handlers/sync-rfq';
import { syncSelectionSheet } from './sync-handlers/sync-selection-sheet';
import { syncSerialNo } from './sync-handlers/sync-serial-no';
import { syncStockEntry } from './sync-handlers/sync-stock-entry';
import { syncSupplier } from './sync-handlers/sync-supplier';
import { syncSupplierQuotation } from './sync-handlers/sync-supplier-quotation';
import { syncTask } from './sync-handlers/sync-task';
import { syncTimesheet } from './sync-handlers/sync-timesheet';
import { syncUom } from './sync-handlers/sync-uom';
import { syncWarehouse } from './sync-handlers/sync-warehouse';
import { syncWorkOrder } from './sync-handlers/sync-work-order';

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

  async syncRfqPackage(rfqId: string, userId: string, jobContext?: SyncJobContext) {
    return syncRfqPackage(rfqId, userId, jobContext);
  }

  async syncBid(bidId: string, userId: string, jobContext?: SyncJobContext) {
    return syncBid(bidId, userId, jobContext);
  }

  async syncAward(bidId: string, userId: string, jobContext?: SyncJobContext) {
    return syncAward(bidId, userId, jobContext);
  }

  async syncComplianceDoc(complianceDocId: string, userId: string, jobContext?: SyncJobContext) {
    return syncComplianceDoc(complianceDocId, userId, jobContext);
  }

  async syncSelectionSheet(
    selectionSheetId: string,
    userId: string,
    jobContext?: SyncJobContext,
  ) {
    return syncSelectionSheet(selectionSheetId, userId, jobContext);
  }

  async syncSupplierQuotation(sqId: string, userId: string, jobContext?: SyncJobContext) {
    return syncSupplierQuotation(sqId, userId, jobContext);
  }

  async syncRequestForQuotation(rfqId: string, userId: string, jobContext?: SyncJobContext) {
    return syncRequestForQuotation(rfqId, userId, jobContext);
  }

  async syncMaterialRequest(mrId: string, userId: string, jobContext?: SyncJobContext) {
    return syncMaterialRequest(mrId, userId, jobContext);
  }

  async syncStockEntry(entryId: string, userId: string, jobContext?: SyncJobContext) {
    return syncStockEntry(entryId, userId, jobContext);
  }

  async syncWarehouse(warehouseId: string, userId: string, jobContext?: SyncJobContext) {
    return syncWarehouse(warehouseId, userId, jobContext);
  }

  async syncItem(itemId: string, userId: string, jobContext?: SyncJobContext) {
    return syncItem(itemId, userId, jobContext);
  }

  async syncBom(bomId: string, userId: string, jobContext?: SyncJobContext) {
    return syncBom(bomId, userId, jobContext);
  }

  async syncWorkOrder(workOrderId: string, userId: string, jobContext?: SyncJobContext) {
    return syncWorkOrder(workOrderId, userId, jobContext);
  }

  async syncQualityInspection(
    inspectionId: string,
    userId: string,
    jobContext?: SyncJobContext,
  ) {
    return syncQualityInspection(inspectionId, userId, jobContext);
  }

  async syncSerialNo(serialNoId: string, userId: string, jobContext?: SyncJobContext) {
    return syncSerialNo(serialNoId, userId, jobContext);
  }

  async syncBatch(batchId: string, userId: string, jobContext?: SyncJobContext) {
    return syncBatch(batchId, userId, jobContext);
  }

  async syncUom(uomId: string, userId: string, jobContext?: SyncJobContext) {
    return syncUom(uomId, userId, jobContext);
  }

  async syncItemPrice(itemPriceId: string, userId: string, jobContext?: SyncJobContext) {
    return syncItemPrice(itemPriceId, userId, jobContext);
  }

  async syncPriceList(priceListId: string, userId: string, jobContext?: SyncJobContext) {
    return syncPriceList(priceListId, userId, jobContext);
  }

  async syncEmployee(userId: string, triggerUserId: string, jobContext?: SyncJobContext) {
    return syncEmployee(userId, triggerUserId, jobContext);
  }

  async syncAttendance(attendanceId: string, userId: string, jobContext?: SyncJobContext) {
    return syncAttendance(attendanceId, userId, jobContext);
  }

  async syncLeaveApplication(leaveId: string, userId: string, jobContext?: SyncJobContext) {
    return syncLeaveApplication(leaveId, userId, jobContext);
  }

  async syncHolidayList(holidayListId: string, userId: string, jobContext?: SyncJobContext) {
    return syncHolidayList(holidayListId, userId, jobContext);
  }

  async syncDepartment(divisionId: string, userId: string, jobContext?: SyncJobContext) {
    return syncDepartment(divisionId, userId, jobContext);
  }

  async syncHrSettings(entityId: string, userId: string, jobContext?: SyncJobContext) {
    return syncHrSettings(entityId, userId, jobContext);
  }

  async syncCompany(orgId: string, userId: string, jobContext?: SyncJobContext) {
    return syncCompany(orgId, userId, jobContext);
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

  async syncPaymentEntry(paymentId: string, userId: string, jobContext?: SyncJobContext) {
    return syncPaymentEntry(paymentId, userId, jobContext);
  }

  async syncJournalEntry(entryId: string, userId: string, jobContext?: SyncJobContext) {
    return syncJournalEntry(entryId, userId, jobContext);
  }

  async readGlEntry(erpDocname: string, jobContext?: SyncJobContext) {
    return readGlEntry(erpDocname, jobContext);
  }

  async syncBankAccount(bankAccountId: string, userId: string, jobContext?: SyncJobContext) {
    return syncBankAccount(bankAccountId, userId, jobContext);
  }

  async readModeOfPayment(erpDocname: string, jobContext?: SyncJobContext) {
    return readModeOfPayment(erpDocname, jobContext);
  }

  async syncCostCenter(costCenterId: string, userId: string, jobContext?: SyncJobContext) {
    return syncCostCenter(costCenterId, userId, jobContext);
  }

  async syncBudget(budgetId: string, userId: string, jobContext?: SyncJobContext) {
    return syncBudget(budgetId, userId, jobContext);
  }

  async getSyncStatus(
    entityType: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    const supabase = createScopedServiceClient('erp-sync:get-status');
    const { data } = await supabase
      .from('erp_sync_map')
      .select('id, entity_type, local_id, erp_doctype, erp_docname, synced_at, created_at')
      .eq('entity_type', entityType)
      .eq('local_id', entityId)
      .maybeSingle();
    return data as Record<string, unknown> | null;
  }
}
