/**
 * Sync handlers: KrewPact Opportunity → ERPNext Opportunity
 *                KrewPact Won Deal → ERPNext Sales Order
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockOpportunityResponse, mockSalesOrderResponse } from '../mock-responses';
import { mapOpportunityToErp } from '../opportunity-mapper';
import { mapWonDealToSalesOrder } from '../sales-order-mapper';
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

const OPP_ENTITY = 'opportunity';
const OPP_DOCTYPE = 'Opportunity';

// eslint-disable-next-line max-lines-per-function
export async function syncOpportunity(
  opportunityId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:opportunity');
  const job = await createSyncJob(supabase, OPP_ENTITY, opportunityId, jobContext);
  const existingDocname = await lookupErpDocname(supabase, OPP_ENTITY, opportunityId);

  try {
    if (jobContext?.operation === 'delete') {
      if (existingDocname && !isMockMode()) {
        const { ErpClient } = await import('../client');
        await new ErpClient().delete(OPP_DOCTYPE, existingDocname);
      }
      if (existingDocname) {
        await deleteSyncMap(supabase, OPP_ENTITY, opportunityId);
      }
      await logEvent(supabase, job.id, 'sync_deleted', {
        entity_type: OPP_ENTITY,
        entity_id: opportunityId,
        erp_docname: existingDocname,
      });
      await updateJobStatus(supabase, job, 'succeeded');
      return {
        id: job.id,
        status: 'succeeded',
        entity_type: OPP_ENTITY,
        entity_id: opportunityId,
        erp_docname: existingDocname,
        attempt_count: job.attempt_count,
      };
    }

    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single();

    if (oppError || !opportunity) {
      return failJob(
        supabase,
        job,
        OPP_ENTITY,
        opportunityId,
        `Opportunity not found: ${oppError?.message || 'null'}`,
      );
    }

    const oppData = opportunity as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      if (existingDocname) {
        erpDocname = existingDocname;
      } else {
        const mockResp = mockOpportunityResponse({
          id: opportunityId,
          opportunity_name: oppData.opportunity_name as string,
        });
        erpDocname = mockResp.name;
      }
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      let erpCustomerName: string | null = null;
      if (oppData.account_id) {
        erpCustomerName = await lookupErpDocname(supabase, 'account', oppData.account_id as string);
      }

      const mapped = mapOpportunityToErp({
        id: opportunityId,
        opportunity_name: oppData.opportunity_name as string,
        estimated_revenue: oppData.estimated_revenue as number | null,
        probability_pct: oppData.probability_pct as number | null,
        target_close_date: oppData.target_close_date as string | null,
        division_id: oppData.division_id as string | null,
        // ERPNext party_name requires the Customer docname, not the KrewPact UUID.
        account_id: erpCustomerName,
      });

      if (existingDocname) {
        await client.update<{ name: string }>(OPP_DOCTYPE, existingDocname, mapped);
        erpDocname = existingDocname;
      } else {
        const result = await client.create<{ name: string }>(OPP_DOCTYPE, mapped);
        erpDocname = result.name;
      }
    }

    await upsertSyncMap(supabase, OPP_ENTITY, opportunityId, OPP_DOCTYPE, erpDocname);
    await logEvent(supabase, job.id, existingDocname ? 'sync_updated' : 'sync_completed', {
      entity_type: OPP_ENTITY,
      entity_id: opportunityId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: OPP_ENTITY,
      entity_id: opportunityId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, OPP_ENTITY, opportunityId, message);
  }
}

export async function syncWonDeal(
  opportunityId: string,
  _userId: string,
  wonDate: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:sales-order');
  const job = await createSyncJob(supabase, 'sales_order', opportunityId, jobContext);

  try {
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select('*')
      .eq('id', opportunityId)
      .single();

    if (oppError || !opportunity) {
      return failJob(
        supabase,
        job,
        'sales_order',
        opportunityId,
        `Opportunity not found: ${oppError?.message || 'null'}`,
      );
    }

    const oppData = opportunity as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockSalesOrderResponse({
        id: opportunityId,
        name: oppData.opportunity_name as string,
        amount: (oppData.estimated_revenue as number) || 0,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      // Resolve the ERPNext Customer docname for the linked account
      let erpCustomerName: string | null = null;
      if (oppData.account_id) {
        const { data: syncMapRow } = await supabase
          .from('erp_sync_map')
          .select('erp_docname')
          .eq('entity_type', 'account')
          .eq('local_id', oppData.account_id as string)
          .maybeSingle();
        erpCustomerName = (syncMapRow?.erp_docname as string) || null;
      }

      const mapped = mapWonDealToSalesOrder({
        opportunityId,
        opportunityName: oppData.opportunity_name as string,
        // Pass the resolved ERPNext Customer docname (not the KrewPact UUID).
        // ERPNext Sales Order customer field requires the Customer docname.
        accountId: erpCustomerName,
        estimatedRevenue: oppData.estimated_revenue as number | null,
        wonDate,
      });
      const result = await client.create<{ name: string }>('Sales Order', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'sales_order', opportunityId, 'Sales Order', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'sales_order',
      entity_id: opportunityId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'sales_order',
      entity_id: opportunityId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'sales_order', opportunityId, message);
  }
}
