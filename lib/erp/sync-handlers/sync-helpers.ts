/**
 * Shared types and DB helper functions used by all sync handlers.
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

export type SyncJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'dead_letter';

export interface SyncResult {
  id: string;
  status: 'succeeded' | 'failed' | 'dead_letter';
  entity_type: string;
  entity_id: string;
  erp_docname: string | null;
  attempt_count: number;
  error?: string;
}

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncJobContext {
  jobId?: string;
  attemptCount?: number;
  maxAttempts?: number;
  /**
   * The CRUD operation this sync represents. Defaults to upsert semantics
   * when omitted — handlers look up `erp_sync_map` and create or update
   * based on whether a prior mapping exists.
   */
  operation?: SyncOperation;
}

export interface SyncJobRecord {
  id: string;
  attempt_count: number;
  max_attempts: number;
}

type SyncJobRef = string | SyncJobRecord;

export type SupabaseClient = ReturnType<typeof createScopedServiceClient>;

function getAttemptCount(context?: SyncJobContext): number {
  return Math.max(1, context?.attemptCount ?? 1);
}

function getMaxAttempts(context?: SyncJobContext): number {
  const configured = context?.maxAttempts ?? 3;
  return Math.max(getAttemptCount(context), configured);
}

function getJobId(job: SyncJobRef): string {
  return typeof job === 'string' ? job : job.id;
}

function getJobAttemptCount(job: SyncJobRef): number {
  return typeof job === 'string' ? 1 : job.attempt_count;
}

function getJobMaxAttempts(job: SyncJobRef): number {
  return typeof job === 'string' ? 3 : job.max_attempts;
}

function toDbStatus(
  status: SyncJobStatus,
): 'queued' | 'processing' | 'succeeded' | 'failed' | 'dead_letter' {
  return status === 'running' ? 'processing' : status;
}

export function normalizeSyncJobStatus(status: string | null | undefined): SyncJobStatus {
  if (status === 'processing') return 'running';
  if (
    status === 'succeeded' ||
    status === 'failed' ||
    status === 'dead_letter' ||
    status === 'queued'
  ) {
    return status;
  }
  return 'failed';
}

export async function createSyncJob(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
  context?: SyncJobContext,
): Promise<SyncJobRecord> {
  const attemptCount = getAttemptCount(context);
  const maxAttempts = getMaxAttempts(context);

  if (context?.jobId) {
    const { data } = await supabase
      .from('erp_sync_jobs')
      .update({
        status: toDbStatus('running'),
        started_at: new Date().toISOString(),
        completed_at: null,
        last_error: null,
        attempt_count: attemptCount,
        max_attempts: maxAttempts,
      })
      .eq('id', context.jobId)
      .select('id, attempt_count, max_attempts')
      .single();

    if (data) {
      return data as SyncJobRecord;
    }
  }

  const { data } = await supabase
    .from('erp_sync_jobs')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      status: toDbStatus('running'),
      sync_direction: 'outbound',
      attempt_count: attemptCount,
      max_attempts: maxAttempts,
      started_at: new Date().toISOString(),
      payload: {},
    })
    .select('id, attempt_count, max_attempts')
    .single();

  return (
    (data as SyncJobRecord | null) ?? {
      id: 'unknown',
      attempt_count: attemptCount,
      max_attempts: maxAttempts,
    }
  );
}

export async function updateJobStatus(
  supabase: SupabaseClient,
  job: SyncJobRef,
  status: Extract<SyncJobStatus, 'succeeded' | 'failed' | 'dead_letter'>,
): Promise<void> {
  await supabase
    .from('erp_sync_jobs')
    .update({
      status: toDbStatus(status),
      completed_at: new Date().toISOString(),
      attempt_count: getJobAttemptCount(job),
      max_attempts: getJobMaxAttempts(job),
      last_error: status === 'succeeded' ? null : undefined,
    })
    .eq('id', getJobId(job));
}

/**
 * Look up an existing ERPNext docname for a KrewPact entity.
 * Returns null when no prior sync mapping exists.
 */
export async function lookupErpDocname(
  supabase: SupabaseClient,
  entityType: string,
  localId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('erp_sync_map')
    .select('erp_docname')
    .eq('entity_type', entityType)
    .eq('local_id', localId)
    .maybeSingle();
  const docname = (data as { erp_docname?: string } | null)?.erp_docname;
  return typeof docname === 'string' && docname.length > 0 ? docname : null;
}

/**
 * Remove the sync map entry for a deleted entity. Called after a successful
 * ERPNext delete so future reads don't resurrect a stale docname.
 */
export async function deleteSyncMap(
  supabase: SupabaseClient,
  entityType: string,
  localId: string,
): Promise<void> {
  await supabase
    .from('erp_sync_map')
    .delete()
    .eq('entity_type', entityType)
    .eq('local_id', localId);
}

// eslint-disable-next-line max-params
export async function upsertSyncMap(
  supabase: SupabaseClient,
  entityType: string,
  localId: string,
  erpDoctype: string,
  erpDocname: string,
): Promise<void> {
  await supabase.from('erp_sync_map').upsert({
    entity_type: entityType,
    local_id: localId,
    erp_doctype: erpDoctype,
    erp_docname: erpDocname,
    direction: 'outbound',
  });
}

export async function logEvent(
  supabase: SupabaseClient,
  jobId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await supabase.from('erp_sync_events').insert({
    job_id: jobId,
    event_type: eventType,
    event_payload: payload,
  });
}

// eslint-disable-next-line max-params
export async function failJob(
  supabase: SupabaseClient,
  job: SyncJobRef,
  entityType: string,
  entityId: string,
  errorMessage: string,
): Promise<SyncResult> {
  const jobId = getJobId(job);
  const attemptCount = getJobAttemptCount(job);
  const maxAttempts = getJobMaxAttempts(job);
  const finalStatus: SyncResult['status'] = attemptCount >= maxAttempts ? 'dead_letter' : 'failed';

  await supabase.from('erp_sync_errors').insert({
    job_id: jobId,
    error_message: errorMessage,
    error_code: 'SYNC_ERROR',
  });

  await logEvent(
    supabase,
    jobId,
    finalStatus === 'dead_letter' ? 'sync_dead_lettered' : 'sync_failed',
    {
      entity_type: entityType,
      entity_id: entityId,
      error: errorMessage,
      attempt_count: attemptCount,
      max_attempts: maxAttempts,
    },
  );

  await supabase
    .from('erp_sync_jobs')
    .update({
      status: toDbStatus(finalStatus),
      completed_at: new Date().toISOString(),
      attempt_count: attemptCount,
      max_attempts: maxAttempts,
      last_error: errorMessage,
    })
    .eq('id', jobId);

  return {
    id: jobId,
    status: finalStatus,
    entity_type: entityType,
    entity_id: entityId,
    erp_docname: null,
    attempt_count: attemptCount,
    error: errorMessage,
  };
}
