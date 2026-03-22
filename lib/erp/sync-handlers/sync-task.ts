/**
 * Sync handler: KrewPact Task → ERPNext Task
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockTaskResponse } from '../mock-responses';
import { isMockMode } from '../sync-service';
import { mapTaskToErp } from '../task-mapper';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

export async function syncTask(
  taskId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:task');
  const job = await createSyncJob(supabase, 'task', taskId, jobContext);

  try {
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return failJob(
        supabase,
        job,
        'task',
        taskId,
        `Task not found: ${taskError?.message || 'null'}`,
      );
    }

    const t = task as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockTaskResponse({
        id: taskId,
        title: t.title as string,
        project_id: t.project_id as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      // Resolve the ERPNext Project docname for the linked project
      let erpProjectName: string | null = null;
      if (t.project_id) {
        const { data: syncMapRow } = await supabase
          .from('erp_sync_map')
          .select('erp_docname')
          .eq('entity_type', 'project')
          .eq('local_id', t.project_id as string)
          .maybeSingle();
        erpProjectName = (syncMapRow?.erp_docname as string) || null;
      }

      const mapped = mapTaskToErp({
        id: taskId,
        // Pass the resolved ERPNext Project docname (not the KrewPact UUID).
        // ERPNext Task project field requires the Project docname.
        project_id: erpProjectName || (t.project_id as string),
        title: t.title as string,
        description: t.description as string | null,
        status: t.status as string,
        priority: t.priority as string | null,
        assigned_user_id: t.assigned_user_id as string | null,
        due_at: t.due_at as string | null,
        start_at: t.start_at as string | null,
        completed_at: t.completed_at as string | null,
      });
      const result = await client.create<{ name: string }>('Task', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'task', taskId, 'Task', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'task',
      entity_id: taskId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'task',
      entity_id: taskId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'task', taskId, message);
  }
}
