/**
 * Queue layer — public surface.
 *
 * Production: Upstash QStash (HTTP-based, serverless, auto-retry).
 * Dev/Test: In-memory Map (no external dependencies).
 *
 * Usage:
 *   import { queue, JobType } from '@/lib/queue';
 *   await queue.enqueue(JobType.ERPSyncAccount, { entityId: id, userId });
 */

export { Queue, queue } from './client';
export { processJob } from './processor';
export type { Job, JobPayload, JobStatus, QueueStats } from './types';
export { JobType } from './types';
export { verifyQStashSignature } from './verify';
