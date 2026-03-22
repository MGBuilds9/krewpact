import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

import { getKrewpactRoles } from '@/lib/api/org';
import { rateLimit, rateLimitResponse } from '@/lib/api/rate-limit';
import { normalizeSyncJobStatus } from '@/lib/erp/sync-handlers/sync-helpers';
import { createScopedServiceClient } from '@/lib/supabase/server';

const SYNC_ROLES = new Set(['platform_admin', 'operations_manager']);

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
 * GET /api/erp/sync/[jobId] — Get the status of a sync job.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const denied = await requireSyncAccess();
  if (denied) return denied;

  const rl = await rateLimit(request, { limit: 60, window: '1 m', identifier: userId });
  if (!rl.success) return rateLimitResponse(rl);

  const { jobId } = await context.params;
  const supabase = createScopedServiceClient('erp-sync:status');

  const { data: job, error } = await supabase
    .from('erp_sync_jobs')
    .select(
      'id, entity_type, entity_id, sync_direction, status, payload, scheduled_at, started_at, completed_at, attempt_count, max_attempts, last_error, created_at, updated_at',
    )
    .eq('id', jobId)
    .single();

  if (error || !job) {
    return NextResponse.json({ error: 'Sync job not found' }, { status: 404 });
  }

  // Also fetch sync map entry if it exists
  const jobData = job as Record<string, unknown>;
  const { data: syncMap } = await supabase
    .from('erp_sync_map')
    .select(
      'id, entity_type, local_id, local_key, erp_doctype, erp_docname, direction, created_at, updated_at',
    )
    .eq('entity_type', jobData.entity_type as string)
    .eq('local_id', jobData.entity_id as string)
    .maybeSingle();

  return NextResponse.json({
    ...jobData,
    status: normalizeSyncJobStatus(jobData.status as string | undefined),
    db_status: jobData.status,
    erp_docname: syncMap ? (syncMap as Record<string, unknown>).erp_docname : null,
  });
}
