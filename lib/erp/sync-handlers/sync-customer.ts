/**
 * Sync handler: KrewPact Account → ERPNext Customer
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { toErpAddress } from '../address-mapper';
import { toErpCustomer } from '../customer-mapper';
import { mockCustomerResponse } from '../mock-responses';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  deleteSyncMap,
  failJob,
  logEvent,
  lookupErpDocname,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

const ENTITY = 'account';
const DOCTYPE = 'Customer';

// eslint-disable-next-line max-lines-per-function
export async function syncAccount(
  accountId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:account');
  const job = await createSyncJob(supabase, ENTITY, accountId, jobContext);
  const existingDocname = await lookupErpDocname(supabase, ENTITY, accountId);

  try {
    if (jobContext?.operation === 'delete') {
      if (existingDocname && !isMockMode()) {
        const { ErpClient } = await import('../client');
        await new ErpClient().delete(DOCTYPE, existingDocname);
      }
      if (existingDocname) {
        await deleteSyncMap(supabase, ENTITY, accountId);
      }
      await logEvent(supabase, job.id, 'sync_deleted', {
        entity_type: ENTITY,
        entity_id: accountId,
        erp_docname: existingDocname,
      });
      await updateJobStatus(supabase, job, 'succeeded');
      return {
        id: job.id,
        status: 'succeeded',
        entity_type: ENTITY,
        entity_id: accountId,
        erp_docname: existingDocname,
        attempt_count: job.attempt_count,
      };
    }

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return failJob(
        supabase,
        job,
        ENTITY,
        accountId,
        `Account not found: ${accountError?.message || 'null'}`,
      );
    }

    const accountData = account as Record<string, unknown>;
    const billingAddr = accountData.billing_address as Record<string, unknown> | null;
    let erpDocname: string;

    if (isMockMode()) {
      if (existingDocname) {
        erpDocname = existingDocname;
      } else {
        const mockResp = mockCustomerResponse({
          id: accountId,
          account_name: accountData.account_name as string,
          account_type: accountData.account_type as string | undefined,
          billing_address: billingAddr,
        });
        erpDocname = mockResp.name;
      }

      if (billingAddr && Object.keys(billingAddr).length > 0) {
        await logEvent(supabase, job.id, 'address_synced', {
          entity_type: ENTITY,
          entity_id: accountId,
          erp_docname: erpDocname,
          mock: true,
        });
      }
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = toErpCustomer({
        id: accountId,
        account_name: accountData.account_name as string,
        account_type: accountData.account_type as string | null,
        division_id: accountData.division_id as string | null,
        status: accountData.status as string | null,
        billing_address: billingAddr,
        phone: accountData.phone as string | null,
        website: accountData.website as string | null,
        industry: accountData.industry as string | null,
      });

      if (existingDocname) {
        await client.update<{ name: string }>(DOCTYPE, existingDocname, mapped);
        erpDocname = existingDocname;
      } else {
        const result = await client.create<{ name: string }>(DOCTYPE, mapped);
        erpDocname = result.name;

        if (billingAddr && Object.keys(billingAddr).length > 0) {
          const addrPayload = toErpAddress({
            address: billingAddr,
            ownerName: accountData.account_name as string,
            linkDoctype: DOCTYPE,
            linkName: erpDocname,
          });
          if (addrPayload) {
            await client.create('Address', addrPayload);
            await logEvent(supabase, job.id, 'address_synced', {
              entity_type: ENTITY,
              entity_id: accountId,
              erp_docname: erpDocname,
            });
          }
        }
      }
    }

    await upsertSyncMap(supabase, ENTITY, accountId, DOCTYPE, erpDocname);
    await logEvent(supabase, job.id, existingDocname ? 'sync_updated' : 'sync_completed', {
      entity_type: ENTITY,
      entity_id: accountId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: ENTITY,
      entity_id: accountId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, ENTITY, accountId, message);
  }
}
