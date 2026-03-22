/**
 * Sync handler: KrewPact Portal Account → ERPNext Supplier
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockSupplierResponse } from '../mock-responses';
import { mapSupplierToErp } from '../supplier-mapper';
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

export async function syncSupplier(
  portalAccountId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:supplier');
  const job = await createSyncJob(supabase, 'supplier', portalAccountId, jobContext);

  try {
    const { data: portalAccount, error: paError } = await supabase
      .from('portal_accounts')
      .select('*')
      .eq('id', portalAccountId)
      .single();

    if (paError || !portalAccount) {
      return failJob(
        supabase,
        job,
        'supplier',
        portalAccountId,
        `Portal account not found: ${paError?.message || 'null'}`,
      );
    }

    const pa = portalAccount as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockSupplierResponse({
        id: portalAccountId,
        company_name: pa.company_name as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapSupplierToErp({
        id: portalAccountId,
        company_name: pa.company_name as string,
        account_type: pa.account_type as string | null,
        billing_address: pa.billing_address as Record<string, unknown> | null,
        division_id: pa.division_id as string | null,
      });
      const result = await client.create<{ name: string }>('Supplier', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'supplier', portalAccountId, 'Supplier', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'supplier',
      entity_id: portalAccountId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'supplier',
      entity_id: portalAccountId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'supplier', portalAccountId, message);
  }
}
