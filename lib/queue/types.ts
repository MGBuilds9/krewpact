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
