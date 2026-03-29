/**
 * Sync handler: ERPNext GL Entry -> KrewPact (ONE-WAY READ ONLY)
 * GL entries are NEVER created or updated from KrewPact.
 * This handler reads GL entries from ERPNext and stores them locally.
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { fromErpGlEntry } from '../gl-entry-mapper';
import { mockGlEntryResponse } from '../mock-responses';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
} from './sync-helpers';

export async function readGlEntry(
  erpDocname: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:read-gl-entry');
  const job = await createSyncJob(supabase, 'gl_entry', erpDocname, jobContext);

  try {
    let glData: Record<string, unknown>;

    if (isMockMode()) {
      const mockResp = mockGlEntryResponse(erpDocname);
      glData = mockResp.data;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      glData = await client.get<Record<string, unknown>>('GL Entry', erpDocname);
    }

    const mapped = fromErpGlEntry(glData);

    await supabase.from('erp_sync_events').insert({
      job_id: job.id,
      event_type: 'gl_entry_read',
      event_payload: mapped,
    });

    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'gl_entry',
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'gl_entry',
      entity_id: erpDocname,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'gl_entry', erpDocname, message);
  }
}
