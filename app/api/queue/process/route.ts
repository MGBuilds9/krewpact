/**
 * POST /api/queue/process — QStash job processor endpoint.
 *
 * QStash publishes messages to this endpoint. Each message contains a job
 * type and payload. This route verifies the QStash signature, then runs
 * the job via the processor.
 *
 * QStash handles retries automatically (configured at publish time).
 * Returning a non-2xx status tells QStash to retry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logger';
import { processJob } from '@/lib/queue/processor';
import { verifyQStashSignature } from '@/lib/queue/verify';
import { JobType } from '@/lib/queue/types';

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

export async function POST(request: NextRequest) {
  // 1. Read body once, then verify signature
  const rawBody = await request.text();
  const signature = request.headers.get('upstash-signature');

  const verification = await verifyQStashSignature(signature, rawBody);
  if (!verification.valid) {
    logger.warn('QStash signature verification failed', { error: verification.error });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Parse and validate the job payload
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = jobSchema.safeParse(body);
  if (!parsed.success) {
    logger.error('Invalid job payload from QStash', {
      errors: parsed.error.flatten(),
    });
    // Return 400 so QStash does NOT retry (bad payload won't fix itself)
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { jobId, type, payload } = parsed.data;

  // 3. Process the job
  try {
    logger.info('Processing QStash job', { jobId, type, entityId: payload.entityId });

    await processJob({
      id: jobId,
      type: type as JobType,
      payload,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'running',
      nextRunAt: new Date(),
    });

    logger.info('QStash job completed', { jobId, type });
    return NextResponse.json({ success: true, jobId });
  } catch (err) {
    logger.error('QStash job failed', {
      jobId,
      type,
      error: err instanceof Error ? err : undefined,
    });
    // Return 500 so QStash retries
    return NextResponse.json(
      { error: 'Job processing failed', jobId },
      { status: 500 },
    );
  }
}
