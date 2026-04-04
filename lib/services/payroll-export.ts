/**
 * Payroll Export Service — ADP CSV Pipeline orchestrator.
 *
 * Creates export batches from time_entries, generates ADP-format CSV,
 * uploads to Supabase Storage. Data helpers, aggregation, and CSV generation
 * are delegated to focused sub-modules.
 */

import { logger } from '@/lib/logger';
import type { Database, Json } from '@/types/supabase';

import { buildExportBatch } from './payroll-aggregator';
import { generateCSV, uploadToStorage } from './payroll-csv';
import type { ExportBatchParams, PayrollClient } from './payroll-data-helpers';

// Re-export types and functions needed by external callers
export { buildExportBatch } from './payroll-aggregator';
export { generateCSV, uploadToStorage } from './payroll-csv';
export type {
  ExportBatchParams,
  ExportRowData,
  ReconciliationResult,
} from './payroll-data-helpers';

// Re-export from split module for backward compatibility
export { reconcileExport } from './payroll-reconcile';

// ─── Helpers ──────────────────────────────────────────────

interface UpdateStatusParams {
  supabase: PayrollClient;
  exportId: string;
  status: Database['public']['Enums']['payroll_export_status'];
  rowCount: number;
  errorLog?: Record<string, Json>;
}

export async function updateExportStatus(params: UpdateStatusParams): Promise<void> {
  const { supabase, exportId, status, rowCount, errorLog } = params;
  await supabase
    .from('payroll_exports')
    .update({
      status,
      row_count: rowCount,
      ...(errorLog ? { error_log: errorLog } : {}),
    })
    .eq('id', exportId);
}

/**
 * Creates a payroll export record and processes the batch.
 */
export async function createPayrollExport(
  supabase: PayrollClient,
  params: ExportBatchParams,
): Promise<{ exportId: string; csv: string; rowCount: number }> {
  const { periodStart, periodEnd, divisionIds, createdBy } = params;

  // Create export record
  const { data: exportRecord, error: insertError } = await supabase
    .from('payroll_exports')
    .insert({
      division_id: divisionIds[0],
      format: 'adp_csv',
      status: 'processing',
      period_start: periodStart,
      period_end: periodEnd,
      created_by: createdBy,
      row_count: 0,
    })
    .select('id')
    .single();

  if (insertError || !exportRecord) {
    logger.error('Failed to create payroll export record', { error: insertError?.message });
    throw new Error(`Failed to create export: ${insertError?.message ?? 'Unknown'}`);
  }

  const exportId = exportRecord.id;

  try {
    // Build the batch data
    const rows = await buildExportBatch(supabase, params);

    if (rows.length === 0) {
      await updateExportStatus({ supabase, exportId, status: 'completed', rowCount: 0 });
      return { exportId, csv: generateCSV([]), rowCount: 0 };
    }

    // Insert export rows
    const exportRows = rows.map((r) => ({
      export_id: exportId,
      employee_id: r.employee_id,
      employee_name: r.employee_name || null,
      hours_regular: r.hours_regular,
      hours_overtime: r.hours_overtime,
      cost_code: r.cost_code || null,
      pay_rate: r.pay_rate || null,
      department: r.department || null,
      project_id: r.project_id,
      status: 'pending',
    }));

    await supabase.from('payroll_export_rows').insert(exportRows);

    // Generate CSV
    const csv = generateCSV(rows);

    // Upload to storage
    const fileUrl = await uploadToStorage(supabase, csv, exportId);

    // Update export record with results
    await supabase
      .from('payroll_exports')
      .update({
        status: 'completed',
        file_url: fileUrl,
        row_count: rows.length,
      })
      .eq('id', exportId);

    return { exportId, csv, rowCount: rows.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    await updateExportStatus({
      supabase,
      exportId,
      status: 'failed',
      rowCount: 0,
      errorLog: { error: message },
    });
    throw err;
  }
}
