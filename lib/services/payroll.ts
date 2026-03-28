import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

type TimesheetBatchRow = Database['public']['Tables']['timesheet_batches']['Row'];

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BatchEntry {
  user_id: string;
  employee_id?: string;
  project_id?: string;
  work_date: string;
  hours_regular: number;
  hours_overtime: number;
  cost_code?: string;
}

export interface AdpExportRow {
  employee_id: string;
  date: string;
  hours: number;
  type: string;
  project_code: string;
}

// ─── Service Functions ─────────────────────────────────────────────────────────

/**
 * Groups time entries into a timesheet batch for a pay period.
 */
export async function createBatch(
  supabase: SupabaseClient<Database>,
  params: {
    divisionId: string;
    periodStart: string;
    periodEnd: string;
    submittedBy: string;
    entries: BatchEntry[];
  },
): Promise<TimesheetBatchRow> {
  const { divisionId, periodStart, periodEnd, submittedBy } = params;

  const { data, error } = await supabase
    .from('timesheet_batches')
    .insert({
      division_id: divisionId,
      period_start: periodStart,
      period_end: periodEnd,
      submitted_by: submittedBy,
      status: 'draft',
    })
    .select('id, division_id, period_start, period_end, submitted_by, approved_by, status, adp_export_reference, exported_at, created_at, updated_at')
    .single();

  if (error) {
    logger.error('Failed to create timesheet batch', { error: error.message, divisionId });
    throw new Error(`Failed to create batch: ${error.message}`);
  }

  return data;
}

/**
 * Submits a draft batch for approval.
 */
export async function submitBatch(
  supabase: SupabaseClient<Database>,
  batchId: string,
): Promise<TimesheetBatchRow> {
  const { data, error } = await supabase
    .from('timesheet_batches')
    .update({ status: 'submitted', updated_at: new Date().toISOString() })
    .eq('id', batchId)
    .eq('status', 'draft')
    .select('id, division_id, period_start, period_end, submitted_by, approved_by, status, adp_export_reference, exported_at, created_at, updated_at')
    .single();

  if (error) {
    logger.error('Failed to submit timesheet batch', { error: error.message, batchId });
    throw new Error(`Failed to submit batch: ${error.message}`);
  }

  return data;
}

/**
 * Approves a submitted batch.
 */
export async function approveBatch(
  supabase: SupabaseClient<Database>,
  batchId: string,
  approverId: string,
): Promise<TimesheetBatchRow> {
  const { data, error } = await supabase
    .from('timesheet_batches')
    .update({
      status: 'approved',
      approved_by: approverId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', batchId)
    .eq('status', 'submitted')
    .select('id, division_id, period_start, period_end, submitted_by, approved_by, status, adp_export_reference, exported_at, created_at, updated_at')
    .single();

  if (error) {
    logger.error('Failed to approve timesheet batch', { error: error.message, batchId });
    throw new Error(`Failed to approve batch: ${error.message}`);
  }

  return data;
}

/**
 * Rejects a submitted batch with a reason.
 */
export async function rejectBatch(
  supabase: SupabaseClient<Database>,
  batchId: string,
  rejecterId: string,
  reason: string,
): Promise<TimesheetBatchRow> {
  const { data, error } = await supabase
    .from('timesheet_batches')
    .update({
      status: 'rejected',
      approved_by: rejecterId,
      updated_at: new Date().toISOString(),
      adp_export_reference: `REJECTED: ${reason}`,
    })
    .eq('id', batchId)
    .eq('status', 'submitted')
    .select('id, division_id, period_start, period_end, submitted_by, approved_by, status, adp_export_reference, exported_at, created_at, updated_at')
    .single();

  if (error) {
    logger.error('Failed to reject timesheet batch', { error: error.message, batchId });
    throw new Error(`Failed to reject batch: ${error.message}`);
  }

  return data;
}

/**
 * Generates an ADP-compatible CSV string for an approved batch.
 * Format: Employee ID, Date, Hours, Type, Project Code
 */
export async function exportToADP(
  supabase: SupabaseClient<Database>,
  batchId: string,
): Promise<string> {
  // Fetch the batch to validate it's approved
  const { data: batch, error: batchError } = await supabase
    .from('timesheet_batches')
    .select('id, status, period_start, period_end, division_id')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) {
    logger.error('Batch not found for ADP export', { batchId });
    throw new Error(`Batch not found: ${batchId}`);
  }

  if (batch.status !== 'approved') {
    throw new Error(`Batch must be approved before export. Current status: ${batch.status}`);
  }

  // Fetch time entries linked to this batch period
  const { data: entries, error: entriesError } = await supabase
    .from('time_entries')
    .select('user_id, work_date, hours_regular, hours_overtime, cost_code, project_id')
    .gte('work_date', batch.period_start)
    .lte('work_date', batch.period_end);

  if (entriesError) {
    logger.error('Failed to fetch time entries for ADP export', {
      error: entriesError.message,
      batchId,
    });
    throw new Error(`Failed to fetch entries: ${entriesError.message}`);
  }

  const rows: AdpExportRow[] = [];

  for (const entry of entries ?? []) {
    if (entry.hours_regular > 0) {
      rows.push({
        employee_id: entry.user_id,
        date: entry.work_date,
        hours: entry.hours_regular,
        type: 'REG',
        project_code: entry.project_id ?? entry.cost_code ?? '',
      });
    }

    const ot = entry.hours_overtime ?? 0;
    if (ot > 0) {
      rows.push({
        employee_id: entry.user_id,
        date: entry.work_date,
        hours: ot,
        type: 'OT',
        project_code: entry.project_id ?? entry.cost_code ?? '',
      });
    }
  }

  const header = 'Employee ID,Date,Hours,Type,Project Code';
  const csvRows = rows.map(
    (r) =>
      `${csvEscape(r.employee_id)},${csvEscape(r.date)},${r.hours},${csvEscape(r.type)},${csvEscape(r.project_code)}`,
  );

  // Mark batch as exported
  await supabase
    .from('timesheet_batches')
    .update({
      status: 'exported',
      exported_at: new Date().toISOString(),
      adp_export_reference: `ADP-${batchId.slice(0, 8)}-${Date.now()}`,
    })
    .eq('id', batchId);

  return [header, ...csvRows].join('\n');
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
