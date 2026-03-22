import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getKrewpactRoles } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { ErpClient } from '@/lib/erp/client';
import { normalizeSyncJobStatus } from '@/lib/erp/sync-handlers/sync-helpers';
import { logger } from '@/lib/logger';
import { JobType, queue } from '@/lib/queue';
import { createScopedServiceClient } from '@/lib/supabase/server';

const ENTITY_TYPES = [
  'account',
  'contact',
  'opportunity',
  'estimate',
  'contract',
  'project',
  'task',
  'supplier',
  'expense',
  'timesheet',
] as const;

type EntityType = (typeof ENTITY_TYPES)[number];

const SYNC_ROLES = new Set(['platform_admin', 'operations_manager']);
const MAX_SYNC_ATTEMPTS = 3;

const syncRequestSchema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.string().uuid(),
});

function getJobType(entityType: EntityType): JobType {
  const syncMap: Record<EntityType, JobType> = {
    account: JobType.ERPSyncAccount,
    contact: JobType.ERPSyncContact,
    opportunity: JobType.ERPSyncOpportunity,
    estimate: JobType.ERPSyncEstimate,
    contract: JobType.ERPSyncSalesOrder,
    project: JobType.ERPSyncProject,
    task: JobType.ERPSyncTask,
    supplier: JobType.ERPSyncSupplier,
    expense: JobType.ERPSyncExpense,
    timesheet: JobType.ERPSyncTimesheet,
  };
  return syncMap[entityType];
}

function getSyncEntityType(entityType: EntityType): string {
  return entityType === 'contract' ? 'sales_order' : entityType;
}

async function requireSyncAccess(): Promise<NextResponse | null> {
  const roles = await getKrewpactRoles();
  if (!roles.some((role) => SYNC_ROLES.has(role))) {
    return NextResponse.json(
      { error: 'Forbidden: platform_admin or operations_manager role required' },
      { status: 403 },
    );
  }
  return null;
}

/**
 * POST /api/erp/sync — Trigger an ERP sync for a given entity.
 * Supports all 10 outbound entity types (12 MVP mappings including read-only invoices).
 * Returns the sync job result (status, erp_docname, etc.)
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const denied = await requireSyncAccess();
  if (denied) return denied;

  const rl = await rateLimit(request, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = syncRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { entity_type, entity_id } = parsed.data;
  const syncEntityType = getSyncEntityType(entity_type);

  const erpClient = new ErpClient();
  if (process.env.NODE_ENV === 'production' && erpClient.isMockMode()) {
    return NextResponse.json(
      {
        error: 'ERPNext is not configured for background sync in this environment',
      },
      { status: 503 },
    );
  }
  if (process.env.NODE_ENV === 'production' && !process.env.QSTASH_TOKEN) {
    return NextResponse.json(
      { error: 'QStash is not configured for background sync in this environment' },
      { status: 503 },
    );
  }

  try {
    const supabase = createScopedServiceClient('erp-sync:enqueue');
    const { data: existingJob } = await supabase
      .from('erp_sync_jobs')
      .select('id, status')
      .eq('entity_type', syncEntityType)
      .eq('entity_id', entity_id)
      .eq('sync_direction', 'outbound')
      .in('status', ['queued', 'processing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJob) {
      return NextResponse.json(
        {
          job_id: existingJob.id,
          status: normalizeSyncJobStatus(existingJob.status),
          entity_type: syncEntityType,
          entity_id,
          poll_url: `/api/erp/sync/${existingJob.id}`,
        },
        { status: 202 },
      );
    }

    const { data: syncJob, error: insertError } = await supabase
      .from('erp_sync_jobs')
      .insert({
        entity_type: syncEntityType,
        entity_id,
        sync_direction: 'outbound',
        status: 'queued',
        attempt_count: 0,
        max_attempts: MAX_SYNC_ATTEMPTS,
        payload: {
          requested_by: userId,
          enqueue_source: 'api',
          requested_entity_type: entity_type,
        },
      })
      .select('id, max_attempts')
      .single();

    if (insertError || !syncJob) {
      logger.error('Failed to create ERP sync job', {
        entity_type: syncEntityType,
        entity_id,
        error: insertError,
      });
      return NextResponse.json({ error: 'Failed to enqueue sync job' }, { status: 500 });
    }

    const queued = await queue.enqueue(
      getJobType(entity_type),
      {
        entityId: entity_id,
        userId,
        meta: {
          syncJobId: syncJob.id,
          maxAttempts: syncJob.max_attempts,
          requestedEntityType: entity_type,
          wonDate: entity_type === 'contract' ? new Date().toISOString().slice(0, 10) : undefined,
        },
      },
      syncJob.max_attempts,
    );

    await supabase
      .from('erp_sync_jobs')
      .update({
        payload: {
          requested_by: userId,
          enqueue_source: 'api',
          requested_entity_type: entity_type,
          queue_job_id: queued.id,
        },
      })
      .eq('id', syncJob.id);

    return NextResponse.json(
      {
        job_id: syncJob.id,
        status: 'queued',
        entity_type: syncEntityType,
        entity_id,
        poll_url: `/api/erp/sync/${syncJob.id}`,
      },
      { status: 202 },
    );
  } catch (err) {
    logger.error('ERP sync failed:', err as Record<string, unknown>);
    return NextResponse.json({ error: 'Failed to enqueue ERP sync' }, { status: 500 });
  }
}
