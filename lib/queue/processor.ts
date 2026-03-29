/**
 * Queue processor — maps JobType to SyncService methods.
 * Called by Queue.process() for each eligible job.
 */

import { SyncService } from '@/lib/erp/sync-service';
import { submitFeedbackToEngine } from '@/lib/takeoff/feedback';

import { Job, JobType } from './types';

const syncService = new SyncService();

type SyncResult = { status?: string; error?: string } | undefined;
type JobContext = { jobId: string; attemptCount?: number; maxAttempts?: number } | undefined;

function buildJobContext(meta: Job['payload']['meta']): JobContext {
  if (typeof meta?.syncJobId !== 'string') return undefined;
  return {
    jobId: meta.syncJobId,
    attemptCount:
      typeof meta.attemptCount === 'number' && Number.isFinite(meta.attemptCount)
        ? meta.attemptCount
        : undefined,
    maxAttempts:
      typeof meta.maxAttempts === 'number' && Number.isFinite(meta.maxAttempts)
        ? meta.maxAttempts
        : undefined,
  };
}

async function handleErpSyncSalesOrder(
  entityId: string,
  userId: string,
  meta: Job['payload']['meta'],
  ctx: JobContext,
): Promise<SyncResult> {
  const wonDate =
    typeof meta?.wonDate === 'string' ? meta.wonDate : new Date().toISOString().slice(0, 10);
  return syncService.syncWonDeal(entityId, userId, wonDate, ctx);
}

async function handleTakeoffFeedback(
  entityId: string,
  meta: Job['payload']['meta'],
): Promise<void> {
  await submitFeedbackToEngine(entityId, (meta?.supabaseJobId as string) ?? entityId);
}

type SyncHandler = (entityId: string, userId: string, ctx: JobContext) => Promise<SyncResult>;

const syncHandlers: Partial<Record<JobType, SyncHandler>> = {
  [JobType.ERPSyncAccount]: (id, uid, ctx) => syncService.syncAccount(id, uid, ctx),
  [JobType.ERPSyncEstimate]: (id, uid, ctx) => syncService.syncEstimate(id, uid, ctx),
  [JobType.ERPSyncOpportunity]: (id, uid, ctx) => syncService.syncOpportunity(id, uid, ctx),
  [JobType.ERPSyncContact]: (id, uid, ctx) => syncService.syncContact(id, uid, ctx),
  [JobType.ERPSyncProject]: (id, uid, ctx) => syncService.syncProject(id, uid, ctx),
  [JobType.ERPSyncTask]: (id, uid, ctx) => syncService.syncTask(id, uid, ctx),
  [JobType.ERPSyncSupplier]: (id, uid, ctx) => syncService.syncSupplier(id, uid, ctx),
  [JobType.ERPSyncExpense]: (id, uid, ctx) => syncService.syncExpenseClaim(id, uid, ctx),
  [JobType.ERPSyncTimesheet]: (id, uid, ctx) => syncService.syncTimesheet(id, uid, ctx),
  [JobType.ERPReadInvoice]: (id, _uid, ctx) => syncService.readSalesInvoice(id, ctx),
  [JobType.ERPReadPO]: (id, _uid, ctx) => syncService.readPurchaseInvoice(id, ctx),
  [JobType.ERPSyncSupplierQuotation]: (id, uid, ctx) =>
    syncService.syncSupplierQuotation(id, uid, ctx),
  [JobType.ERPSyncRequestForQuotation]: (id, uid, ctx) =>
    syncService.syncRequestForQuotation(id, uid, ctx),
  [JobType.ERPSyncMaterialRequest]: (id, uid, ctx) =>
    syncService.syncMaterialRequest(id, uid, ctx),
  [JobType.ERPSyncStockEntry]: (id, uid, ctx) => syncService.syncStockEntry(id, uid, ctx),
  [JobType.ERPSyncWarehouse]: (id, uid, ctx) => syncService.syncWarehouse(id, uid, ctx),
  [JobType.ERPSyncItem]: (id, uid, ctx) => syncService.syncItem(id, uid, ctx),
};

export async function processJob(job: Job): Promise<void> {
  const { entityId, userId, meta } = job.payload;
  const ctx = buildJobContext(meta);

  if (job.type === JobType.ERPSyncSalesOrder) {
    const result = await handleErpSyncSalesOrder(entityId, userId, meta, ctx);
    if (result?.status === 'failed') {
      throw new Error(result.error ?? `Background job ${job.type} failed`);
    }
    return;
  }

  if (job.type === JobType.TakeoffFeedback) {
    await handleTakeoffFeedback(entityId, meta);
    return;
  }

  const handler = syncHandlers[job.type];
  if (!handler) {
    // If a new JobType is added without a handler entry it will hit this at runtime
    throw new Error(`Unknown job type: ${String(job.type)}`);
  }

  const result = await handler(entityId, userId, ctx);
  if (result?.status === 'failed') {
    throw new Error(result.error ?? `Background job ${job.type} failed`);
  }
}
