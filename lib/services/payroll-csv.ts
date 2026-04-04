/**
 * Payroll CSV: generates ADP-format CSV and uploads to Supabase Storage.
 * Used by payroll-export.ts as part of the ADP CSV pipeline.
 */

import { csvEscape } from '@/lib/csv/parse-csv';
import { logger } from '@/lib/logger';

import type { ExportRowData, PayrollClient } from './payroll-data-helpers';

// ─── ADP CSV Column Mapping (MVP hardcoded) ───────────────

const ADP_COLUMNS = [
  'Employee ID',
  'Hours - Regular',
  'Hours - Overtime',
  'Cost Code',
  'Pay Rate',
  'Department',
] as const;

/**
 * Generates an ADP-format CSV string from export row data.
 */
export function generateCSV(rows: ExportRowData[]): string {
  const header = ADP_COLUMNS.join(',');
  const csvRows = rows.map((r) =>
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
