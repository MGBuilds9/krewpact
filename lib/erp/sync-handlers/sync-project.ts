/**
 * Sync handler: KrewPact Project → ERPNext Project
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockProjectResponse } from '../mock-responses';
import { mapProjectToErp } from '../project-mapper';
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

const ENTITY = 'project';
const DOCTYPE = 'Project';

// eslint-disable-next-line max-lines-per-function
export async function syncProject(
  projectId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:project');
  const job = await createSyncJob(supabase, ENTITY, projectId, jobContext);
  const existingDocname = await lookupErpDocname(supabase, ENTITY, projectId);

  try {
    if (jobContext?.operation === 'delete') {
      if (existingDocname && !isMockMode()) {
        const { ErpClient } = await import('../client');
        await new ErpClient().delete(DOCTYPE, existingDocname);
      }
      if (existingDocname) {
        await deleteSyncMap(supabase, ENTITY, projectId);
      }
      await logEvent(supabase, job.id, 'sync_deleted', {
        entity_type: ENTITY,
        entity_id: projectId,
        erp_docname: existingDocname,
      });
      await updateJobStatus(supabase, job, 'succeeded');
      return {
        id: job.id,
        status: 'succeeded',
        entity_type: ENTITY,
        entity_id: projectId,
        erp_docname: existingDocname,
        attempt_count: job.attempt_count,
      };
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return failJob(
        supabase,
        job,
        ENTITY,
        projectId,
        `Project not found: ${projectError?.message || 'null'}`,
      );
    }

    const p = project as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      if (existingDocname) {
        erpDocname = existingDocname;
      } else {
        const mockResp = mockProjectResponse({
          id: projectId,
          project_number: p.project_number as string,
          project_name: p.project_name as string,
        });
        erpDocname = mockResp.name;
      }
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      let erpCustomerName: string | null = null;
      if (p.account_id) {
        erpCustomerName = await lookupErpDocname(supabase, 'account', p.account_id as string);
      }

      const mapped = mapProjectToErp({
        id: projectId,
        project_number: p.project_number as string,
        project_name: p.project_name as string,
        status: p.status as string,
        start_date: p.start_date as string | null,
        target_completion_date: p.target_completion_date as string | null,
        baseline_budget: p.baseline_budget as number | null,
        // ERPNext Project customer field requires the Customer docname, not the KrewPact UUID.
        account_id: erpCustomerName,
        division_id: p.division_id as string | null,
      });

      if (existingDocname) {
        await client.update<{ name: string }>(DOCTYPE, existingDocname, mapped);
        erpDocname = existingDocname;
      } else {
        const result = await client.create<{ name: string }>(DOCTYPE, mapped);
        erpDocname = result.name;
      }
    }

    await upsertSyncMap(supabase, ENTITY, projectId, DOCTYPE, erpDocname);
    await logEvent(supabase, job.id, existingDocname ? 'sync_updated' : 'sync_completed', {
      entity_type: ENTITY,
      entity_id: projectId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: ENTITY,
      entity_id: projectId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, ENTITY, projectId, message);
  }
}
