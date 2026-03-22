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
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

export async function syncOpportunity(
  opportunityId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:opportunity');
  const job = await createSyncJob(supabase, 'opportunity', opportunityId, jobContext);

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
        'opportunity',
        opportunityId,
        `Opportunity not found: ${oppError?.message || 'null'}`,
      );
    }

    const oppData = opportunity as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockOpportunityResponse({
        id: opportunityId,
        opportunity_name: oppData.opportunity_name as string,
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

      const mapped = mapOpportunityToErp({
        id: opportunityId,
        opportunity_name: oppData.opportunity_name as string,
        estimated_revenue: oppData.estimated_revenue as number | null,
        probability_pct: oppData.probability_pct as number | null,
        target_close_date: oppData.target_close_date as string | null,
        division_id: oppData.division_id as string | null,
        // Pass the resolved ERPNext Customer docname (not the KrewPact UUID).
        // ERPNext party_name requires the Customer docname.
        account_id: erpCustomerName,
      });
      const result = await client.create<{ name: string }>('Opportunity', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'opportunity', opportunityId, 'Opportunity', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'opportunity',
      entity_id: opportunityId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'opportunity',
      entity_id: opportunityId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'opportunity', opportunityId, message);
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
