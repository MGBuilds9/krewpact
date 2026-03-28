import { NextResponse } from 'next/server';

import { forbidden, notFound } from '@/lib/api/errors';
import { getKrewpactRoles } from '@/lib/api/org';
import { withApiRoute } from '@/lib/api/with-api-route';
import { normalizeSyncJobStatus } from '@/lib/erp/sync-handlers/sync-helpers';
import { createScopedServiceClient } from '@/lib/supabase/server';

const SYNC_ROLES = new Set(['platform_admin', 'operations_manager']);

export const GET = withApiRoute({}, async ({ params }) => {
  const roles = await getKrewpactRoles();
  if (!roles.some((role) => SYNC_ROLES.has(role))) {
    throw forbidden('platform_admin or operations_manager role required');
  }

  const { jobId } = params;
  const supabase = createScopedServiceClient('erp-sync:status');

  const { data: job, error } = await supabase
    .from('erp_sync_jobs')
    .select(
      'id, entity_type, entity_id, sync_direction, status, payload, scheduled_at, started_at, completed_at, attempt_count, max_attempts, last_error, created_at, updated_at',
    )
    .eq('id', jobId)
    .single();

  if (error || !job) throw notFound('Sync job');

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
});
