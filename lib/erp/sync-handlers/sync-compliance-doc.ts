/**
 * Sync handler: KrewPact compliance_documents → ERPNext MDM Trade Compliance Doc
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { nextMockId } from '../mock-types';
import { type ComplianceDocInput, toErpComplianceDoc } from '../compliance-mapper';
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

export async function syncComplianceDoc(
  complianceDocId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:compliance-doc');
  const job = await createSyncJob(supabase, 'compliance_doc', complianceDocId, jobContext);

  try {
    const { data: doc, error: docError } = await supabase
      .from('compliance_documents')
      .select('*')
      .eq('id', complianceDocId)
      .single();

    if (docError || !doc) {
      return failJob(
        supabase,
        job,
        'compliance_doc',
        complianceDocId,
        `Compliance document not found: ${docError?.message || 'null'}`,
      );
    }

    const d = doc as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      erpDocname = nextMockId('COMP');
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const docInput: ComplianceDocInput = {
        id: complianceDocId,
        portal_account_id: d.portal_account_id as string,
        supplier_name: d.supplier_name as string | null,
        erp_supplier_name: d.erp_supplier_name as string | null,
        doc_type: d.doc_type as string,
        doc_name: d.doc_name as string,
        expiry_date: d.expiry_date as string | null,
        status: d.status as string,
        file_url: d.file_url as string | null,
      };
      const mapped = toErpComplianceDoc(docInput);
      const result = await client.create<{ name: string }>('MDM Trade Compliance Doc', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(
      supabase,
      'compliance_doc',
      complianceDocId,
      'MDM Trade Compliance Doc',
      erpDocname,
    );
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'compliance_doc',
      entity_id: complianceDocId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'compliance_doc',
      entity_id: complianceDocId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'compliance_doc', complianceDocId, message);
  }
}
