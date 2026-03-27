import { NextResponse } from 'next/server';
import { z } from 'zod';

import { forbidden, serverError } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
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

export const POST = withApiRoute(
  {
    rateLimit: { limit: 10, window: '1 m' },
    bodySchema: triggerSchema,
  },
  async ({ body, userId }) => {
    const roles = await getKrewpactRoles();
    if (!roles.some((r) => ALLOWED_ROLES.includes(r))) {
      throw forbidden('Forbidden');
    }

    const { entity_type } = body;
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
      throw serverError('Failed to trigger sync');
    }
  },
);
