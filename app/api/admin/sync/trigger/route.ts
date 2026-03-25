import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getKrewpactRoles } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { logger } from '@/lib/logger';
import { queue } from '@/lib/queue/client';
import { JobType } from '@/lib/queue/types';

const ALLOWED_ROLES = ['platform_admin'];

const ENTITY_TYPE_JOB_MAP: Record<string, JobType> = {
  account: JobType.ERPSyncAccount,
  contact: JobType.ERPSyncContact,
  estimate: JobType.ERPSyncEstimate,
  opportunity: JobType.ERPSyncOpportunity,
  sales_order: JobType.ERPSyncSalesOrder,
  project: JobType.ERPSyncProject,
  task: JobType.ERPSyncTask,
  supplier: JobType.ERPSyncSupplier,
  expense_claim: JobType.ERPSyncExpense,
  timesheet: JobType.ERPSyncTimesheet,
};

const triggerSchema = z.object({
  entity_type: z.enum([
    'account',
    'contact',
    'estimate',
    'opportunity',
    'sales_order',
    'project',
    'task',
    'supplier',
    'expense_claim',
    'timesheet',
  ]),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const roles = await getKrewpactRoles();
  if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rl = await rateLimit(req, { limit: 10, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = triggerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid entity_type', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { entity_type } = parsed.data;
  const jobType = ENTITY_TYPE_JOB_MAP[entity_type];

  try {
    const job = await queue.enqueue(jobType, {
      entityId: 'bulk-trigger',
      userId,
      meta: { triggered_by: userId, entity_type, triggered_at: new Date().toISOString() },
    });

    logger.info('ERP sync manually triggered', { entity_type, jobId: job.id, userId });

    return NextResponse.json({
      ok: true,
      job_id: job.id,
      entity_type,
      message: `Sync triggered for ${entity_type}`,
    });
  } catch (err) {
    logger.error('Failed to enqueue sync job', {
      entity_type,
      error: err instanceof Error ? err : undefined,
    });
    return NextResponse.json({ error: 'Failed to trigger sync' }, { status: 500 });
  }
}
