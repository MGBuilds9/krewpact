/**
 * Sync handler: KrewPact quality inspection -> ERPNext Quality Inspection
 */

import type { QualityInspectionMapInput } from '@/lib/erp/quality-inspection-mapper';
import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockQualityInspectionResponse } from '../mock-manufacturing-responses';
import { mapQualityInspectionToErp } from '../quality-inspection-mapper';
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

function buildMapInput(
  inspectionId: string,
  record: Record<string, unknown>,
): QualityInspectionMapInput {
  return {
    id: inspectionId,
    inspection_type: record.inspection_type as 'Incoming' | 'Outgoing' | 'In Process',
    reference_type: (record.reference_type as string) || '',
    reference_name: (record.reference_name as string) || '',
    item_code: record.item_code as string,
    item_name: record.item_name as string,
    sample_size: (record.sample_size as number) || 1,
    inspected_by: record.inspected_by as string | null,
    inspection_date: record.inspection_date as string,
    remarks: record.remarks as string | null,
    readings: ((record.readings as Record<string, unknown>[]) || []).map((r) => ({
      specification: r.specification as string,
      value: r.value as string,
      min_value: r.min_value as number | null,
      max_value: r.max_value as number | null,
      status: r.status as 'Accepted' | 'Rejected',
    })),
  };
}

export async function syncQualityInspection(
  inspectionId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:quality-inspection');
  const job = await createSyncJob(supabase, 'quality_inspection', inspectionId, jobContext);

  try {
    const { data: qi, error: qiError } = await supabase
      .from('quality_inspections')
      .select('*')
      .eq('id', inspectionId)
      .single();

    if (qiError || !qi) {
      return failJob(
        supabase,
        job,
        'quality_inspection',
        inspectionId,
        `Quality inspection not found: ${qiError?.message || 'null'}`,
      );
    }

    const record = qi as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockQualityInspectionResponse({
        id: inspectionId,
        inspection_type: record.inspection_type as string,
        item_code: record.item_code as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapQualityInspectionToErp(buildMapInput(inspectionId, record));
      const result = await client.create<{ name: string }>('Quality Inspection', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'quality_inspection', inspectionId, 'Quality Inspection', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'quality_inspection',
      entity_id: inspectionId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'quality_inspection',
      entity_id: inspectionId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'quality_inspection', inspectionId, message);
  }
}
