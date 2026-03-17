/**
 * Queue processor — maps JobType to SyncService methods.
 * Called by Queue.process() for each eligible job.
 */

import { SyncService } from '@/lib/erp/sync-service';

import { Job, JobType } from './types';

const syncService = new SyncService();

export async function processJob(job: Job): Promise<void> {
  const { entityId, userId, meta } = job.payload;

  switch (job.type) {
    case JobType.ERPSyncAccount:
      await syncService.syncAccount(entityId, userId);
      break;

    case JobType.ERPSyncEstimate:
      await syncService.syncEstimate(entityId, userId);
      break;

    case JobType.ERPSyncOpportunity:
      await syncService.syncOpportunity(entityId, userId);
      break;

    case JobType.ERPSyncContact:
      await syncService.syncContact(entityId, userId);
      break;

    case JobType.ERPSyncProject:
      await syncService.syncProject(entityId, userId);
      break;

    case JobType.ERPSyncTask:
      await syncService.syncTask(entityId, userId);
      break;

    case JobType.ERPSyncSupplier:
      await syncService.syncSupplier(entityId, userId);
      break;

    case JobType.ERPSyncExpense:
      await syncService.syncExpenseClaim(entityId, userId);
      break;

    case JobType.ERPSyncTimesheet:
      await syncService.syncTimesheet(entityId, userId);
      break;

    case JobType.ERPReadInvoice:
      await syncService.readSalesInvoice(entityId);
      break;

    case JobType.ERPReadPO:
      await syncService.readPurchaseInvoice(entityId);
      break;

    default: {
      const _exhaustive: never = job.type;
      throw new Error(`Unknown job type: ${_exhaustive}`);
    }
  }

  void meta; // suppress unused warning for future use
}
