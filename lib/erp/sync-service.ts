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
import { createUserClient } from '@/lib/supabase/server';

import { syncContact } from './sync-handlers/sync-contact';
import { syncAccount } from './sync-handlers/sync-customer';
import { syncExpenseClaim } from './sync-handlers/sync-expense';
import {
  readPaymentEntry,
  readPurchaseInvoice,
  readSalesInvoice,
} from './sync-handlers/sync-invoices';
import { syncOpportunity, syncWonDeal } from './sync-handlers/sync-opportunity';
import { syncProject } from './sync-handlers/sync-project';
import { syncEstimate } from './sync-handlers/sync-quotation';
import { syncSupplier } from './sync-handlers/sync-supplier';
import { syncTask } from './sync-handlers/sync-task';
import { syncTimesheet } from './sync-handlers/sync-timesheet';

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
  async syncAccount(accountId: string, userId: string) {
    return syncAccount(accountId, userId);
  }

  async syncEstimate(estimateId: string, userId: string) {
    return syncEstimate(estimateId, userId);
  }

  async syncOpportunity(opportunityId: string, userId: string) {
    return syncOpportunity(opportunityId, userId);
  }

  async syncWonDeal(opportunityId: string, userId: string, wonDate: string) {
    return syncWonDeal(opportunityId, userId, wonDate);
  }

  async syncContact(contactId: string, userId: string) {
    return syncContact(contactId, userId);
  }

  async syncProject(projectId: string, userId: string) {
    return syncProject(projectId, userId);
  }

  async syncTask(taskId: string, userId: string) {
    return syncTask(taskId, userId);
  }

  async syncSupplier(portalAccountId: string, userId: string) {
    return syncSupplier(portalAccountId, userId);
  }

  async syncExpenseClaim(expenseClaimId: string, userId: string) {
    return syncExpenseClaim(expenseClaimId, userId);
  }

  async syncTimesheet(timesheetBatchId: string, userId: string) {
    return syncTimesheet(timesheetBatchId, userId);
  }

  async readSalesInvoice(erpDocname: string) {
    return readSalesInvoice(erpDocname);
  }

  async readPurchaseInvoice(erpDocname: string) {
    return readPurchaseInvoice(erpDocname);
  }

  async readPaymentEntry(erpDocname: string) {
    return readPaymentEntry(erpDocname);
  }

  async getSyncStatus(
    entityType: string,
    entityId: string,
  ): Promise<Record<string, unknown> | null> {
    const supabase = await createUserClient();
    const { data } = await supabase
      .from('erp_sync_map')
      .select('*')
      .eq('entity_type', entityType)
      .eq('local_id', entityId)
      .maybeSingle();
    return data as Record<string, unknown> | null;
  }
}
