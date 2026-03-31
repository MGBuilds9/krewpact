/**
 * Sync handler: KrewPact user -> ERPNext Employee
 *
 * Employee is the most important HR mapping — it bridges HR data and KrewPact users.
 * The krewpact_user_id custom field links to the users table.
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import type { EmployeeMapInput } from '../employee-mapper';
import { mapEmployeeToErp } from '../employee-mapper';
import { mockEmployeeResponse } from '../mock-hr-responses';
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

function buildEmployeeInput(
  userId: string,
  record: Record<string, unknown>,
  erpCompany = 'KrewPact',
): EmployeeMapInput {
  const firstName = (record.first_name as string) || '';
  const lastName = (record.last_name as string) || '';
  return {
    id: userId,
    employee_name: `${firstName} ${lastName}`.trim(),
    first_name: firstName,
    last_name: lastName,
    email: (record.email as string) || '',
    date_of_joining: (record.date_of_joining as string) || new Date().toISOString().slice(0, 10),
    date_of_birth: record.date_of_birth as string | null,
    gender: record.gender as string | null,
    company: (record.company as string) || erpCompany,
    department: record.department as string | null,
    designation: record.designation as string | null,
    status: (record.status as EmployeeMapInput['status']) || 'Active',
  };
}

export async function syncEmployee(
  userId: string,
  _triggerUserId: string,
  jobContext?: SyncJobContext,
  erpCompany = 'KrewPact',
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:employee');
  const job = await createSyncJob(supabase, 'employee', userId, jobContext);

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return failJob(
        supabase,
        job,
        'employee',
        userId,
        `Employee not found: ${userError?.message || 'null'}`,
      );
    }

    const record = user as Record<string, unknown>;
    const input = buildEmployeeInput(userId, record, erpCompany);
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockEmployeeResponse({
        id: userId,
        employee_name: input.employee_name,
        company: input.company,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapEmployeeToErp(input);
      const result = await client.create<{ name: string }>('Employee', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'employee', userId, 'Employee', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'employee',
      entity_id: userId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'employee',
      entity_id: userId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'employee', userId, message);
  }
}
