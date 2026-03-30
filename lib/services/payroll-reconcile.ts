import { parseCsvLine } from '@/lib/csv/parse-csv';

import type { ExportRowData, ReconciliationResult } from './payroll-export';

interface ReconciliationDetail {
  employee_id: string;
  status: 'matched' | 'mismatched' | 'missing_in_adp' | 'missing_in_export';
  expected_hours?: number;
  actual_hours?: number;
  notes?: string;
}

interface ParsedAdpRow {
  employee_id: string;
  hours_regular: number;
  hours_overtime: number;
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

function parseAdpCsv(csvContent: string): ParsedAdpRow[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length < 2) return [];

  const header = parseCsvLine(lines[0]);
  const empIdx = header.indexOf('Employee ID');
  const regIdx = header.indexOf('Hours - Regular');
  const otIdx = header.indexOf('Hours - Overtime');

  if (empIdx === -1) return [];

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      employee_id: cols[empIdx] ?? '',
      hours_regular: regIdx >= 0 ? parseFloat(cols[regIdx] ?? '0') || 0 : 0,
      hours_overtime: otIdx >= 0 ? parseFloat(cols[otIdx] ?? '0') || 0 : 0,
    };
  });
}
