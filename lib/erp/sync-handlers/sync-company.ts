/**
 * Sync handler: KrewPact organization -> ERPNext Company
 * Company is low-frequency — config data, not transactional.
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapCompanyToErp } from '../company-mapper';
import { mockCompanyResponse } from '../mock-hr-responses';
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

export async function syncCompany(
  orgId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:company');
  const job = await createSyncJob(supabase, 'company', orgId, jobContext);

  try {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return failJob(
        supabase,
        job,
        'company',
        orgId,
        `Company not found: ${orgError?.message || 'null'}`,
      );
    }

    const record = org as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockCompanyResponse({
        name: record.name as string,
        company_name: record.name as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapCompanyToErp({
        id: orgId,
        company_name: record.name as string,
        abbreviation:
          (record.abbreviation as string) || (record.name as string).slice(0, 3).toUpperCase(),
        default_currency: (record.default_currency as string) || 'CAD',
        country: (record.country as string) || 'Canada',
      });
      const result = await client.update<{ name: string }>(
        'Company',
        record.name as string,
        mapped,
      );
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'company', orgId, 'Company', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'company',
      entity_id: orgId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'company',
      entity_id: orgId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'company', orgId, message);
  }
}
