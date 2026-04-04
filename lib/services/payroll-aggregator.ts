/**
 * Payroll aggregator: aggregates time entries and builds export batch data.
 * Used by payroll-export.ts as part of the ADP CSV pipeline.
 */

import type { PayrollClient } from './payroll-data-helpers';
import type { ExportBatchParams, ExportRowData } from './payroll-data-helpers';
import { enrichEmployeeNames, fetchDivisionProjectContext } from './payroll-data-helpers';

interface TimeEntry {
  user_id: string;
  hours_regular: number | string | null;
  hours_overtime: number | string | null;
  cost_code: string | null;
  project_id: string | null;
}

function aggregateEntries(
  entries: TimeEntry[],
  projectDivisionMap: Map<string, string>,
  divisionNameMap: Map<string, string>,
): Map<string, ExportRowData> {
  const aggregated = new Map<string, ExportRowData>();

  for (const entry of entries) {
    const existing = aggregated.get(entry.user_id);
    if (existing) {
      existing.hours_regular += Number(entry.hours_regular) || 0;
      existing.hours_overtime += Number(entry.hours_overtime) || 0;
    } else {
      const divId = entry.project_id ? (projectDivisionMap.get(entry.project_id) ?? '') : '';
      aggregated.set(entry.user_id, {
        employee_id: entry.user_id,
        employee_name: '',
        hours_regular: Number(entry.hours_regular) || 0,
        hours_overtime: Number(entry.hours_overtime) || 0,
        cost_code: entry.cost_code ?? '',
        pay_rate: 0,
        department: divId ? (divisionNameMap.get(divId) ?? '') : '',
        project_id: entry.project_id ?? null,
      });
    }
  }

  return aggregated;
}

/**
 * Aggregates time_entries for the given period and divisions
 * into exportable row data.
 */
export async function buildExportBatch(
  supabase: PayrollClient,
  params: ExportBatchParams,
): Promise<ExportRowData[]> {
  const { periodStart, periodEnd, divisionIds } = params;
  const { divisionNameMap, projectDivisionMap, projectIds } = await fetchDivisionProjectContext(
    supabase,
    divisionIds,
  );

  if (projectIds.length === 0) return [];

  const { data: entries, error } = await supabase
    .from('time_entries')
    .select('user_id, hours_regular, hours_overtime, cost_code, project_id')
    .gte('work_date', periodStart)
    .lte('work_date', periodEnd)
    .in('project_id', projectIds);

  if (error) throw new Error(`Failed to fetch time entries: ${error.message}`);
  if (!entries || entries.length === 0) return [];

  const aggregated = aggregateEntries(entries, projectDivisionMap, divisionNameMap);
  await enrichEmployeeNames(supabase, aggregated);
  return Array.from(aggregated.values());
}
