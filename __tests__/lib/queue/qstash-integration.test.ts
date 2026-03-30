/**
 * Tests for QStash-integrated queue.
 *
 * These test the in-memory fallback (no QSTASH_TOKEN set in test env).
 * QStash integration is tested via the /api/queue/process endpoint tests.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { Queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';

describe('Queue (in-memory mode)', () => {
  let q: Queue;

  beforeEach(() => {
    q = new Queue();
  });

  it('should not be in QStash mode without env vars', () => {
    expect(q.isQStashMode()).toBe(false);
  });

  it('enqueueSync creates a pending job in memory', () => {
    const job = q.enqueueSync(JobType.ERPSyncAccount, {
      entityId: '123',
      userId: 'user-1',
    });

    expect(job.id).toBeDefined();
    expect(job.type).toBe(JobType.ERPSyncAccount);
    expect(job.status).toBe('pending');
    expect(job.payload.entityId).toBe('123');
  });

  it('async enqueue falls back to in-memory when no QStash token', async () => {
    const job = await q.enqueue(JobType.ERPSyncContact, {
      entityId: '456',
      userId: 'user-2',
    });

    expect(job.status).toBe('pending');
    expect(q.getJob(job.id)).toBeDefined();
  });

  it('getStats returns correct counts', () => {
    q.enqueueSync(JobType.ERPSyncAccount, { entityId: '1', userId: 'u' });
    q.enqueueSync(JobType.ERPSyncContact, { entityId: '2', userId: 'u' });

    const stats = q.getStats();
    expect(stats.pending).toBe(2);
    expect(stats.total).toBe(2);
    expect(stats.succeeded).toBe(0);
  });

  it('clear removes all jobs', () => {
    q.enqueueSync(JobType.ERPSyncAccount, { entityId: '1', userId: 'u' });
    q.enqueueSync(JobType.ERPSyncContact, { entityId: '2', userId: 'u' });

    q.clear();
    expect(q.getStats().total).toBe(0);
  });
});

describe('Queue process endpoint schema', () => {
  it('validates job payload structure', async () => {
    const { z } = await import('zod');

    const JOB_TYPE_VALUES = Object.values(JobType) as [string, ...string[]];
    const jobSchema = z.object({
      jobId: z.string(),
      type: z.enum(JOB_TYPE_VALUES),
      payload: z.object({
        entityId: z.string(),
        userId: z.string(),
        meta: z.record(z.string(), z.unknown()).optional(),
      }),
    });

    // Valid payload
    const valid = jobSchema.safeParse({
      jobId: 'msg-123',
      type: 'erp-sync-account',
      payload: { entityId: 'uuid-1', userId: 'user-1' },
    });
    expect(valid.success).toBe(true);

    // Invalid type
    const invalid = jobSchema.safeParse({
      jobId: 'msg-123',
      type: 'not-a-real-type',
      payload: { entityId: 'uuid-1', userId: 'user-1' },
    });
    expect(invalid.success).toBe(false);

    // Missing payload fields
    const missing = jobSchema.safeParse({
      jobId: 'msg-123',
      type: 'erp-sync-account',
      payload: { entityId: 'uuid-1' },
    });
    expect(missing.success).toBe(false);
  });
});

describe('verifyQStashSignature', () => {
  it('rejects requests when no signing keys are configured', async () => {
    const { verifyQStashSignature } = await import('@/lib/queue/verify');

    // No env vars set = always reject (no bypass regardless of NODE_ENV)
    const result = await verifyQStashSignature(null, '{"test": true}');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('fails closed in production when signing keys are missing', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    // @ts-expect-error test env override
    process.env.NODE_ENV = 'production';

    const { verifyQStashSignature } = await import('@/lib/queue/verify');
    const result = await verifyQStashSignature(null, '{"test": true}');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('signing keys');

    // @ts-expect-error test env override
    process.env.NODE_ENV = previousNodeEnv;
  });
});
