/**
 * In-memory job queue — zero dependencies.
 *
 * When UPSTASH_REDIS_REST_URL is set this module will (in a future iteration)
 * delegate enqueue/dequeue to Upstash QStash instead of the local Map.
 * For now all state lives in the singleton Map — suitable for dev and
 * single-instance serverless invocations where persistence isn't required.
 *
 * Retry policy: exponential backoff — 1 s → 4 s → 16 s (base 4, capped at 3 attempts).
 * After maxAttempts failures the job transitions to 'dead_letter'.
 */

import { logger } from '@/lib/logger';
import { processJob } from './processor';
import { Job, JobPayload, JobStatus, JobType, QueueStats } from './types';

/** Backoff delay in ms for attempt N (0-indexed): 1000, 4000, 16000 */
function backoffMs(attempt: number): number {
  return Math.pow(4, attempt) * 1000;
}

function generateId(): string {
  // crypto.randomUUID() is available in Node 14.17+ and all modern browsers
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export class Queue {
  private jobs: Map<string, Job> = new Map();

  /** Add a new job to the queue. Returns the created Job. */
  enqueue(type: JobType, payload: JobPayload, maxAttempts = 3): Job {
    const now = new Date();
    const job: Job = {
      id: generateId(),
      type,
      payload,
      attempts: 0,
      maxAttempts,
      createdAt: now,
      updatedAt: now,
      status: 'pending',
      nextRunAt: now,
    };
    this.jobs.set(job.id, job);
    return job;
  }

  /**
   * Process all eligible pending jobs (nextRunAt <= now).
   * Runs sequentially; call on a timer or after enqueue in tests.
   * Returns the number of jobs processed in this tick.
   */
  async process(): Promise<number> {
    const now = new Date();
    const eligible = Array.from(this.jobs.values()).filter(
      (j) => j.status === 'pending' && j.nextRunAt <= now,
    );

    let count = 0;
    for (const job of eligible) {
      await this._runJob(job);
      count++;
    }
    return count;
  }

  /** Retrieve a single job by id. */
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /** Aggregate counts by status. */
  getStats(): QueueStats {
    const counts: Record<JobStatus, number> = {
      pending: 0,
      running: 0,
      succeeded: 0,
      failed: 0,
      dead_letter: 0,
    };
    for (const job of this.jobs.values()) {
      counts[job.status]++;
    }
    return { ...counts, total: this.jobs.size };
  }

  /** Drain all jobs (useful in tests). */
  clear(): void {
    this.jobs.clear();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private async _runJob(job: Job): Promise<void> {
    this._updateJob(job, { status: 'running' });

    try {
      await processJob(job);
      this._updateJob(job, { status: 'succeeded' });
      logger.debug('Job succeeded', { jobId: job.id, type: job.type });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const nextAttempts = job.attempts + 1;

      if (nextAttempts >= job.maxAttempts) {
        logger.error('Job moved to dead letter queue', {
          jobId: job.id,
          type: job.type,
          attempts: nextAttempts,
          error: err instanceof Error ? err : undefined,
          lastError: error,
        });
        this._updateJob(job, {
          status: 'dead_letter',
          attempts: nextAttempts,
          lastError: error,
        });
      } else {
        const delay = backoffMs(nextAttempts);
        const nextRunAt = new Date(Date.now() + delay);
        this._updateJob(job, {
          status: 'pending',
          attempts: nextAttempts,
          lastError: error,
          nextRunAt,
        });
      }
    }
  }

  private _updateJob(job: Job, patch: Partial<Job>): void {
    const updated: Job = { ...job, ...patch, updatedAt: new Date() };
    this.jobs.set(job.id, updated);
    // Update the local reference so subsequent reads in _runJob are fresh
    Object.assign(job, updated);
  }
}

/** Singleton queue instance shared across the process. */
export const queue = new Queue();
