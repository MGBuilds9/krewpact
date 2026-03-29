/**
 * Sync handler: KrewPact stock entry -> ERPNext Stock Entry
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockStockEntryResponse } from '../mock-responses';
import { mapStockEntryToErp } from '../stock-entry-mapper';
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

 
export async function syncStockEntry(
  entryId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:stock-entry');
  const job = await createSyncJob(supabase, 'stock_entry', entryId, jobContext);

  try {
    const { data: entry, error: entryError } = await supabase
      .from('stock_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      return failJob(
        supabase,
        job,
        'stock_entry',
        entryId,
        `Stock entry not found: ${entryError?.message || 'null'}`,
      );
    }

    const record = entry as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockStockEntryResponse({
        id: entryId,
        entry_type: record.entry_type as string,
        posting_date: record.posting_date as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapStockEntryToErp({
        id: entryId,
        entry_type: record.entry_type as
          | 'Material Receipt'
          | 'Material Issue'
          | 'Material Transfer',
        posting_date: record.posting_date as string,
        posting_time: record.posting_time as string | null,
        project_name: record.project_name as string | null,
        remarks: record.remarks as string | null,
        items: ((record.items as Record<string, unknown>[]) || []).map((item) => ({
          item_code: item.item_code as string,
          item_name: item.item_name as string,
          description: item.description as string,
          qty: item.qty as number,
          uom: (item.uom as string) || 'Nos',
          basic_rate: item.basic_rate as number,
          source_warehouse: item.source_warehouse as string | null,
          target_warehouse: item.target_warehouse as string | null,
        })),
      });
      const result = await client.create<{ name: string }>('Stock Entry', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'stock_entry', entryId, 'Stock Entry', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'stock_entry',
      entity_id: entryId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'stock_entry',
      entity_id: entryId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'stock_entry', entryId, message);
  }
}
