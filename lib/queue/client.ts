/**
 * Job queue — Upstash QStash in production, in-memory for dev/test.
 *
 * QStash flow:
 *   enqueue() → publishes HTTP message to QStash
 *     → QStash calls POST /api/queue/process with job payload
 *       → processor.ts runs the job
 *       → QStash handles retry (3 attempts, exponential backoff)
 *
 * In-memory flow (dev/test — no QSTASH_TOKEN):
 *   enqueue() → stores in Map
 *   process() → runs all pending jobs locally
 */

import { logger } from '@/lib/logger';

import { processJob } from './processor';
import { Job, JobPayload, JobStatus, JobType, QueueStats } from './types';

// ---------------------------------------------------------------------------
// QStash client (lazy-loaded to avoid import errors when env vars missing)
// ---------------------------------------------------------------------------

let _qstashClient: import('@upstash/qstash').Client | null = null;

function getQStashClient(): import('@upstash/qstash').Client | null {
  if (_qstashClient) return _qstashClient;

  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;

  // Dynamic import workaround — we load synchronously since the module is installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Client } = require('@upstash/qstash') as typeof import('@upstash/qstash');
  _qstashClient = new Client({ token });
  return _qstashClient;
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

function isQStashEnabled(): boolean {
  return !!process.env.QSTASH_TOKEN;
}

// ---------------------------------------------------------------------------
// Backoff for in-memory queue
// ---------------------------------------------------------------------------

function backoffMs(attempt: number): number {
  return Math.pow(4, attempt) * 1000;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// Queue class
// ---------------------------------------------------------------------------

export class Queue {
  private jobs: Map<string, Job> = new Map();

  /**
   * Add a new job to the queue.
   *
   * In production (QStash): publishes to QStash which calls /api/queue/process.
   * In dev/test: stores in local Map for manual process() calls.
   */
  async enqueue(type: JobType, payload: JobPayload, maxAttempts = 3): Promise<Job> {
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

    const client = getQStashClient();
    if (client) {
      try {
        const response = await client.publishJSON({
          url: `${getAppUrl()}/api/queue/process`,
          body: { jobId: job.id, type: job.type, payload: job.payload },
          retries: maxAttempts - 1,
        });
        job.id = response.messageId;
        job.status = 'pending';
        logger.info('Job enqueued via QStash', { jobId: job.id, type: job.type });
      } catch (err) {
        logger.error('QStash publish failed, falling back to in-memory', {
          type: job.type,
          error: err instanceof Error ? err : undefined,
        });
        // Fall back to in-memory on QStash failure
        this.jobs.set(job.id, job);
      }
    } else {
      // In-memory mode for dev/test
      this.jobs.set(job.id, job);
    }

    return job;
  }

  /**
   * Synchronous enqueue for backwards compatibility (tests).
   * Always uses in-memory queue. Use enqueue() for production code.
   */
  enqueueSync(type: JobType, payload: JobPayload, maxAttempts = 3): Job {
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
   * Process all eligible pending jobs (in-memory only).
   * In production, QStash calls /api/queue/process directly.
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

  /** Retrieve a single job by id (in-memory only). */
  getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /** Aggregate counts by status (in-memory only). */
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

  /** Whether QStash is configured and active. */
  isQStashMode(): boolean {
    return isQStashEnabled();
  }

  /** Drain all jobs (useful in tests). */
  clear(): void {
    this.jobs.clear();
  }

  // ---------------------------------------------------------------------------
  // Internal helpers (in-memory processing)
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
    Object.assign(job, updated);
  }
}

/** Singleton queue instance shared across the process. */
export const queue = new Queue();
