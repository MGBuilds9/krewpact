/**
 * Queue processor — maps JobType to SyncService methods.
 * Called by Queue.process() for each eligible job.
 */

import { SyncService } from '@/lib/erp/sync-service';
import { submitFeedbackToEngine } from '@/lib/takeoff/feedback';

import { Job, JobType } from './types';

const syncService = new SyncService();

export async function processJob(job: Job): Promise<void> {
  const { entityId, userId, meta } = job.payload;
  const jobContext =
    typeof meta?.syncJobId === 'string'
      ? {
          jobId: meta.syncJobId,
          attemptCount:
            typeof meta.attemptCount === 'number' && Number.isFinite(meta.attemptCount)
              ? meta.attemptCount
              : undefined,
          maxAttempts:
            typeof meta.maxAttempts === 'number' && Number.isFinite(meta.maxAttempts)
              ? meta.maxAttempts
              : undefined,
        }
      : undefined;

  let result: { status?: string; error?: string } | undefined;

  switch (job.type) {
    case JobType.ERPSyncAccount:
      result = await syncService.syncAccount(entityId, userId, jobContext);
      break;

    case JobType.ERPSyncEstimate:
      result = await syncService.syncEstimate(entityId, userId, jobContext);
      break;

    case JobType.ERPSyncOpportunity:
      result = await syncService.syncOpportunity(entityId, userId, jobContext);
      break;

    case JobType.ERPSyncSalesOrder:
      result = await syncService.syncWonDeal(
        entityId,
        userId,
        typeof meta?.wonDate === 'string' ? meta.wonDate : new Date().toISOString().slice(0, 10),
        jobContext,
      );
      break;

    case JobType.ERPSyncContact:
      result = await syncService.syncContact(entityId, userId, jobContext);
      break;

    case JobType.ERPSyncProject:
      result = await syncService.syncProject(entityId, userId, jobContext);
      break;

    case JobType.ERPSyncTask:
      result = await syncService.syncTask(entityId, userId, jobContext);
      break;

    case JobType.ERPSyncSupplier:
      result = await syncService.syncSupplier(entityId, userId, jobContext);
      break;

    case JobType.ERPSyncExpense:
      result = await syncService.syncExpenseClaim(entityId, userId, jobContext);
      break;

    case JobType.ERPSyncTimesheet:
      result = await syncService.syncTimesheet(entityId, userId, jobContext);
      break;

    case JobType.ERPReadInvoice:
      result = await syncService.readSalesInvoice(entityId, jobContext);
      break;

    case JobType.ERPReadPO:
      result = await syncService.readPurchaseInvoice(entityId, jobContext);
      break;

    case JobType.TakeoffFeedback:
      await submitFeedbackToEngine(entityId, (meta?.supabaseJobId as string) ?? entityId);
      break;

    default: {
      const _exhaustive: never = job.type;
      throw new Error(`Unknown job type: ${_exhaustive}`);
    }
  }

  if (result?.status === 'failed') {
    throw new Error(result.error ?? `Background job ${job.type} failed`);
  }

  void meta; // suppress unused warning for future use
}
