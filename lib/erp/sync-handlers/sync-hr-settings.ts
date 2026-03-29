/**
 * Sync handler: Read ERPNext HR Settings (singleton config)
 * HR Settings is low-frequency — config data, not transactional.
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockHrSettingsResponse } from '../mock-hr-responses';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

export async function syncHrSettings(
  _entityId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const entityId = 'HR Settings';
  const supabase = createScopedServiceClient('erp-sync:hr-settings');
  const job = await createSyncJob(supabase, 'hr_settings', entityId, jobContext);

  try {
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockHrSettingsResponse();
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const result = await client.get<{ name: string }>('HR Settings', 'HR Settings');
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'hr_settings', entityId, 'HR Settings', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'hr_settings',
      entity_id: entityId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'hr_settings',
      entity_id: entityId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'hr_settings', entityId, message);
  }
}
