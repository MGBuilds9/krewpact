/**
 * Sync handler: KrewPact Project → ERPNext Project
 */

import { createUserClient } from '@/lib/supabase/server';

import { mockProjectResponse } from '../mock-responses';
import { mapProjectToErp } from '../project-mapper';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  failJob,
  logEvent,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

export async function syncProject(projectId: string, _userId: string): Promise<SyncResult> {
  const supabase = await createUserClient();
  const job = await createSyncJob(supabase, 'project', projectId);

  try {
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return failJob(
        supabase,
        job.id,
        'project',
        projectId,
        `Project not found: ${projectError?.message || 'null'}`,
      );
    }

    const p = project as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockProjectResponse({
        id: projectId,
        project_number: p.project_number as string,
        project_name: p.project_name as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      // Resolve the ERPNext Customer docname for the linked account
      let erpCustomerName: string | null = null;
      if (p.account_id) {
        const { data: syncMapRow } = await supabase
          .from('erp_sync_map')
          .select('erp_docname')
          .eq('entity_type', 'account')
          .eq('local_id', p.account_id as string)
          .maybeSingle();
        erpCustomerName = (syncMapRow?.erp_docname as string) || null;
      }

      const mapped = mapProjectToErp({
        id: projectId,
        project_number: p.project_number as string,
        project_name: p.project_name as string,
        status: p.status as string,
        start_date: p.start_date as string | null,
        target_completion_date: p.target_completion_date as string | null,
        baseline_budget: p.baseline_budget as number | null,
        // Pass the resolved ERPNext Customer docname (not the KrewPact UUID).
        // ERPNext Project customer field requires the Customer docname.
        account_id: erpCustomerName,
        division_id: p.division_id as string | null,
      });
      const result = await client.create<{ name: string }>('Project', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'project', projectId, 'Project', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'project',
      entity_id: projectId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job.id, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'project',
      entity_id: projectId,
      erp_docname: erpDocname,
      attempt_count: 1,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job.id, 'project', projectId, message);
  }
}
