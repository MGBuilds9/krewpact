/**
 * Payroll Export Service — ADP CSV Pipeline
 *
 * Builds export batches from time_entries, generates ADP-format CSV,
 * uploads to Supabase Storage, and handles reconciliation.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import type { Database, Json } from '@/types/supabase';

type PayrollClient = SupabaseClient<Database>;

// ─── Types ────────────────────────────────────────────────

export interface ExportBatchParams {
  periodStart: string;
  periodEnd: string;
  divisionIds: string[];
  createdBy: string;
}

export interface ExportRowData {
  employee_id: string;
  employee_name: string;
  hours_regular: number;
  hours_overtime: number;
  cost_code: string;
  pay_rate: number;
  department: string;
  project_id: string | null;
}

export interface ReconciliationResult {
  matched: number;
  mismatched: number;
  missing_in_adp: number;
  missing_in_export: number;
  details: ReconciliationDetail[];
}

interface ReconciliationDetail {
  employee_id: string;
  status: 'matched' | 'mismatched' | 'missing_in_adp' | 'missing_in_export';
  expected_hours?: number;
  actual_hours?: number;
  notes?: string;
}

// ─── ADP CSV Column Mapping (MVP hardcoded) ───────────────

const ADP_COLUMNS = [
  'Employee ID',
  'Hours - Regular',
  'Hours - Overtime',
  'Cost Code',
  'Pay Rate',
  'Department',
] as const;

// ─── Service Functions ────────────────────────────────────

/**
 * Aggregates time_entries for the given period and divisions
 * into exportable row data.
 */
export async function buildExportBatch(
  supabase: PayrollClient,
  params: ExportBatchParams,
): Promise<ExportRowData[]> {
  const { periodStart, periodEnd, divisionIds } = params;

  // Fetch time entries with user and project info
  const { data: entries, error } = await supabase
    .from('time_entries')
    .select('user_id, hours_regular, hours_overtime, cost_code, project_id')
    .gte('work_date', periodStart)
    .lte('work_date', periodEnd);

  if (error) {
    logger.error('Failed to fetch time entries for export', { error: error.message });
    throw new Error(`Failed to fetch time entries: ${error.message}`);
  }

  if (!entries || entries.length === 0) {
    return [];
  }

  // Aggregate by employee (user_id)
  const aggregated = new Map<string, ExportRowData>();

  for (const entry of entries) {
    const key = entry.user_id;
    const existing = aggregated.get(key);

    if (existing) {
      existing.hours_regular += Number(entry.hours_regular) || 0;
      existing.hours_overtime += Number(entry.hours_overtime) || 0;
    } else {
      aggregated.set(key, {
        employee_id: entry.user_id,
        employee_name: '',
        hours_regular: Number(entry.hours_regular) || 0,
        hours_overtime: Number(entry.hours_overtime) || 0,
        cost_code: entry.cost_code ?? '',
        pay_rate: 0,
        department: divisionIds[0] ?? '',
        project_id: entry.project_id ?? null,
      });
    }
  }

  return Array.from(aggregated.values());
}

/**
 * Generates an ADP-format CSV string from export row data.
 */
export function generateCSV(rows: ExportRowData[]): string {
  const header = ADP_COLUMNS.join(',');
  const csvRows = rows.map(
    (r) =>
      [
        csvEscape(r.employee_id),
        r.hours_regular.toFixed(2),
        r.hours_overtime.toFixed(2),
        csvEscape(r.cost_code),
        r.pay_rate.toFixed(2),
        csvEscape(r.department),
      ].join(','),
  );

  return [header, ...csvRows].join('\n');
}

/**
 * Uploads a CSV string to Supabase Storage and returns a signed URL.
 */
export async function uploadToStorage(
  supabase: PayrollClient,
  csv: string,
  exportId: string,
): Promise<string> {
  const bucket = 'payroll-exports';
  const filename = `export-${exportId}-${Date.now()}.csv`;
  const path = `exports/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, new Blob([csv], { type: 'text/csv' }), {
      contentType: 'text/csv',
      upsert: false,
    });

  if (uploadError) {
    logger.error('Failed to upload CSV to storage', { error: uploadError.message, exportId });
    throw new Error(`Failed to upload CSV: ${uploadError.message}`);
  }

  // Create a signed URL valid for 7 days
  const sevenDays = 60 * 60 * 24 * 7;
  const { data: signedUrl, error: urlError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, sevenDays);

  if (urlError || !signedUrl) {
    logger.error('Failed to create signed URL', { error: urlError?.message, exportId });
    throw new Error(`Failed to create signed URL: ${urlError?.message ?? 'Unknown error'}`);
  }

  return signedUrl.signedUrl;
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
    await updateExportStatus({ supabase, exportId, status: 'failed', rowCount: 0, errorLog: { error: message } });
    throw err;
  }
}

/**
 * Reconciles an ADP acknowledgment CSV against export rows.
 */
export function reconcileExport(
  exportRows: ExportRowData[],
  adpCsvContent: string,
): ReconciliationResult {
  const adpRows = parseAdpCsv(adpCsvContent);

  const exportMap = new Map(exportRows.map((r) => [r.employee_id, r]));
  const adpMap = new Map(adpRows.map((r) => [r.employee_id, r]));

  const details: ReconciliationDetail[] = [];
  let matched = 0;
  let mismatched = 0;
  let missingInAdp = 0;

  for (const [empId, exportRow] of exportMap) {
    const adpRow = adpMap.get(empId);
    if (!adpRow) {
      missingInAdp++;
      details.push({
        employee_id: empId,
        status: 'missing_in_adp',
        expected_hours: exportRow.hours_regular + exportRow.hours_overtime,
      });
      continue;
    }

    const exportTotal = exportRow.hours_regular + exportRow.hours_overtime;
    const adpTotal = adpRow.hours_regular + adpRow.hours_overtime;

    if (Math.abs(exportTotal - adpTotal) < 0.01) {
      matched++;
      details.push({ employee_id: empId, status: 'matched' });
    } else {
      mismatched++;
      details.push({
        employee_id: empId,
        status: 'mismatched',
        expected_hours: exportTotal,
        actual_hours: adpTotal,
        notes: `Discrepancy: expected ${exportTotal.toFixed(2)}, got ${adpTotal.toFixed(2)}`,
      });
    }
  }

  // Check for entries in ADP not in export
  let missingInExport = 0;
  for (const empId of adpMap.keys()) {
    if (!exportMap.has(empId)) {
      missingInExport++;
      details.push({
        employee_id: empId,
        status: 'missing_in_export',
        actual_hours: (adpMap.get(empId)?.hours_regular ?? 0) + (adpMap.get(empId)?.hours_overtime ?? 0),
      });
    }
  }

  return { matched, mismatched, missing_in_adp: missingInAdp, missing_in_export: missingInExport, details };
}

// ─── Helpers ──────────────────────────────────────────────

interface UpdateStatusParams {
  supabase: PayrollClient;
  exportId: string;
  status: Database['public']['Enums']['payroll_export_status'];
  rowCount: number;
  errorLog?: Record<string, Json>;
}

async function updateExportStatus(params: UpdateStatusParams): Promise<void> {
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

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

interface ParsedAdpRow {
  employee_id: string;
  hours_regular: number;
  hours_overtime: number;
}

function parseAdpCsv(csvContent: string): ParsedAdpRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0].split(',').map((h) => h.trim());
  const empIdx = header.indexOf('Employee ID');
  const regIdx = header.indexOf('Hours - Regular');
  const otIdx = header.indexOf('Hours - Overtime');

  if (empIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    return {
      employee_id: cols[empIdx] ?? '',
      hours_regular: regIdx >= 0 ? parseFloat(cols[regIdx] ?? '0') || 0 : 0,
      hours_overtime: otIdx >= 0 ? parseFloat(cols[otIdx] ?? '0') || 0 : 0,
    };
  });
}
