/**
 * Queue layer — public surface.
 *
 * Usage:
 *   import { queue, Queue, JobType } from '@/lib/queue';
 *   queue.enqueue(JobType.ERPSyncAccount, { entityId: id, userId });
 *   await queue.process();
 */

export { Queue, queue } from './client';
export { processJob } from './processor';
export { JobType } from './types';
export type { Job, JobPayload, JobStatus, QueueStats } from './types';
