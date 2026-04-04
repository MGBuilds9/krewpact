/**
 * Payroll data helpers: types and lookup helpers for the ADP CSV pipeline.
 * Used by payroll-aggregator.ts and payroll-export.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type PayrollClient = SupabaseClient<Database>;

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
  details: {
    employee_id: string;
    status: 'matched' | 'mismatched' | 'missing_in_adp' | 'missing_in_export';
    expected_hours?: number;
    actual_hours?: number;
    notes?: string;
  }[];
}

// ─── Lookup Helpers ──────────────────────────────────────

export interface DivisionProjectContext {
  divisionNameMap: Map<string, string>;
  projectDivisionMap: Map<string, string>;
  projectIds: string[];
}

export async function fetchDivisionProjectContext(
  supabase: PayrollClient,
  divisionIds: string[],
): Promise<DivisionProjectContext> {
  const [divResult, projResult] = await Promise.all([
    supabase.from('divisions').select('id, name').in('id', divisionIds),
    supabase.from('projects').select('id, division_id').in('division_id', divisionIds),
  ]);

  if (divResult.error) throw new Error(`Failed to fetch divisions: ${divResult.error.message}`);
  if (projResult.error) throw new Error(`Failed to fetch projects: ${projResult.error.message}`);

  return {
    divisionNameMap: new Map((divResult.data ?? []).map((d) => [d.id, d.name])),
    projectDivisionMap: new Map((projResult.data ?? []).map((p) => [p.id, p.division_id])),
    projectIds: (projResult.data ?? []).map((p) => p.id),
  };
}

export async function enrichEmployeeNames(
  supabase: PayrollClient,
  aggregated: Map<string, ExportRowData>,
): Promise<void> {
  const userIds = [...aggregated.keys()];
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, adp_employee_code')
    .in('id', userIds);

  if (error || !users) return;

  const userMap = new Map(users.map((u) => [u.id, u]));
  for (const [userId, row] of aggregated) {
    const user = userMap.get(userId);
    if (user) {
      row.employee_name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
      if (user.adp_employee_code) {
        row.employee_id = user.adp_employee_code;
      }
    }
  }
}
