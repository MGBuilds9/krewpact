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
      // SyncService.syncContact not yet implemented — placeholder
      throw new Error(`syncContact not yet implemented (entity: ${entityId})`);

    case JobType.ERPSyncProject:
      // SyncService.syncProject not yet implemented — placeholder
      throw new Error(`syncProject not yet implemented (entity: ${entityId})`);

    case JobType.ERPSyncTask:
      // SyncService.syncTask not yet implemented — placeholder
      throw new Error(`syncTask not yet implemented (entity: ${entityId})`);

    case JobType.ERPSyncSupplier:
      // SyncService.syncSupplier not yet implemented — placeholder
      throw new Error(`syncSupplier not yet implemented (entity: ${entityId})`);

    case JobType.ERPSyncExpense:
      // SyncService.syncExpense not yet implemented — placeholder
      throw new Error(`syncExpense not yet implemented (entity: ${entityId})`);

    case JobType.ERPSyncTimesheet:
      // SyncService.syncTimesheet not yet implemented — placeholder
      throw new Error(`syncTimesheet not yet implemented (entity: ${entityId})`);

    case JobType.ERPReadInvoice:
      // Read-only fetch — SyncService.readInvoice not yet implemented
      throw new Error(`readInvoice not yet implemented (entity: ${entityId})`);

    case JobType.ERPReadPO:
      // Read-only fetch — SyncService.readPO not yet implemented
      throw new Error(`readPO not yet implemented (entity: ${entityId})`);

    default: {
      const _exhaustive: never = job.type;
      throw new Error(`Unknown job type: ${_exhaustive}`);
    }
  }

  void meta; // suppress unused warning for future use
}
