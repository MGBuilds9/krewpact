/**
 * Shared types and DB helper functions used by all sync handlers.
 */

import { createUserClient } from '@/lib/supabase/server';

export interface SyncResult {
  id: string;
  status: 'succeeded' | 'failed';
  entity_type: string;
  entity_id: string;
  erp_docname: string | null;
  attempt_count: number;
  error?: string;
}

export type SupabaseClient = Awaited<ReturnType<typeof createUserClient>>;

export async function createSyncJob(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
): Promise<{ id: string }> {
  const { data } = await supabase
    .from('erp_sync_jobs')
    .insert({
      entity_type: entityType,
      entity_id: entityId,
      status: 'queued',
      sync_direction: 'outbound',
      attempt_count: 0,
      max_attempts: 3,
      payload: {},
    })
    .select('id')
    .single();

  return { id: ((data as Record<string, unknown>)?.id as string) || 'unknown' };
}

export async function updateJobStatus(
  supabase: SupabaseClient,
  jobId: string,
  status: 'succeeded' | 'failed',
): Promise<void> {
  await supabase
    .from('erp_sync_jobs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      attempt_count: 1,
    })
    .eq('id', jobId);
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
  jobId: string,
  entityType: string,
  entityId: string,
  errorMessage: string,
): Promise<SyncResult> {
  await supabase.from('erp_sync_errors').insert({
    job_id: jobId,
    error_message: errorMessage,
    error_code: 'SYNC_ERROR',
  });

  await logEvent(supabase, jobId, 'sync_failed', {
    entity_type: entityType,
    entity_id: entityId,
    error: errorMessage,
  });

  await updateJobStatus(supabase, jobId, 'failed');

  return {
    id: jobId,
    status: 'failed',
    entity_type: entityType,
    entity_id: entityId,
    erp_docname: null,
    attempt_count: 1,
    error: errorMessage,
  };
}
