/**
 * Queue layer types — zero-dependency in-memory job queue.
 * Swaps to Upstash QStash when QSTASH_TOKEN is set.
 */

export enum JobType {
  ERPSyncAccount = 'erp-sync-account',
  ERPSyncContact = 'erp-sync-contact',
  ERPSyncEstimate = 'erp-sync-estimate',
  ERPSyncOpportunity = 'erp-sync-opportunity',
  ERPSyncSalesOrder = 'erp-sync-sales-order',
  ERPSyncProject = 'erp-sync-project',
  ERPSyncTask = 'erp-sync-task',
  ERPSyncSupplier = 'erp-sync-supplier',
  ERPSyncExpense = 'erp-sync-expense',
  ERPSyncTimesheet = 'erp-sync-timesheet',
  ERPReadInvoice = 'erp-read-invoice',
  ERPReadPO = 'erp-read-po',
  ERPSyncSupplierQuotation = 'erp-sync-supplier-quotation',
  ERPSyncRequestForQuotation = 'erp-sync-request-for-quotation',
  ERPSyncMaterialRequest = 'erp-sync-material-request',
  ERPSyncStockEntry = 'erp-sync-stock-entry',
  ERPSyncWarehouse = 'erp-sync-warehouse',
  ERPSyncItem = 'erp-sync-item',
  ERPSyncPaymentEntry = 'erp-sync-payment-entry',
  ERPSyncJournalEntry = 'erp-sync-journal-entry',
  ERPReadGlEntry = 'erp-read-gl-entry',
  ERPSyncBankAccount = 'erp-sync-bank-account',
  ERPReadModeOfPayment = 'erp-read-mode-of-payment',
  ERPSyncCostCenter = 'erp-sync-cost-center',
  ERPSyncBudget = 'erp-sync-budget',
  ERPSyncBom = 'erp-sync-bom',
  ERPSyncWorkOrder = 'erp-sync-work-order',
  ERPSyncQualityInspection = 'erp-sync-quality-inspection',
  ERPSyncSerialNo = 'erp-sync-serial-no',
  ERPSyncBatch = 'erp-sync-batch',
  ERPSyncUom = 'erp-sync-uom',
  ERPSyncItemPrice = 'erp-sync-item-price',
  ERPSyncPriceList = 'erp-sync-price-list',
  ERPSyncEmployee = 'erp-sync-employee',
  ERPSyncAttendance = 'erp-sync-attendance',
  ERPSyncLeaveApplication = 'erp-sync-leave-application',
  ERPSyncHolidayList = 'erp-sync-holiday-list',
  ERPSyncDepartment = 'erp-sync-department',
  ERPSyncHrSettings = 'erp-sync-hr-settings',
  ERPSyncCompany = 'erp-sync-company',
  ERPSyncInventoryPo = 'erp-sync-inventory-po',
  ERPSyncGoodsReceipt = 'erp-sync-goods-receipt',
  ERPSyncChangeOrder = 'erp-sync-change-order',
  ERPSyncRfqPackage = 'erp-sync-rfq-package',
  ERPSyncBidEntry = 'erp-sync-bid',
  ERPSyncAward = 'erp-sync-award',
  ERPSyncComplianceDoc = 'erp-sync-compliance-doc',
  ERPSyncSelectionSheet = 'erp-sync-selection-sheet',
  ERPSyncMaterialCost = 'erp-sync-material-cost',
  TakeoffFeedback = 'takeoff-feedback',
  PayrollCSVExport = 'payroll-csv-export',
}

export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'dead_letter';

export interface JobPayload {
  entityId: string;
  userId: string;
  /** Extra data specific to the job type (e.g. wonDate for sales order). */
  meta?: Record<string, unknown>;
}

export interface Job {
  id: string;
  type: JobType;
  payload: JobPayload;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  status: JobStatus;
  /** ISO string of the next earliest run time (used for backoff). */
  nextRunAt: Date;
  lastError?: string;
}

export interface QueueStats {
  pending: number;
  running: number;
  succeeded: number;
  failed: number;
  dead_letter: number;
  total: number;
}
