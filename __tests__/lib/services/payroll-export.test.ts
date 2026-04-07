/**
 * Tests for PayrollExportService — ADP CSV pipeline
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { mockSupabaseClient } from '@/__tests__/helpers/mock-supabase';
import {
  buildExportBatch,
  type ExportRowData,
  generateCSV,
  reconcileExport,
} from '@/lib/services/payroll-export';

const TEST_USER_1 = '00000000-0000-4000-a000-000000000001';
const TEST_USER_2 = '00000000-0000-4000-a000-000000000002';
const TEST_DIVISION = '00000000-0000-4000-a000-000000000010';
const TEST_PROJECT_1 = '00000000-0000-4000-a000-000000000101';
const TEST_PROJECT_2 = '00000000-0000-4000-a000-000000000102';

const DIVISION_MOCK = { data: [{ id: TEST_DIVISION, name: 'MDM Contracting' }], error: null };
const PROJECTS_MOCK = {
  data: [
    { id: TEST_PROJECT_1, division_id: TEST_DIVISION },
    { id: TEST_PROJECT_2, division_id: TEST_DIVISION },
  ],
  error: null,
};
const USERS_MOCK = {
  data: [
    { id: TEST_USER_1, first_name: 'Test', last_name: 'Worker', adp_employee_code: 'E0042' },
    { id: TEST_USER_2, first_name: 'Other', last_name: 'Worker', adp_employee_code: null },
  ],
  error: null,
};

function makeExportRow(overrides: Partial<ExportRowData> = {}): ExportRowData {
  return {
    employee_id: TEST_USER_1,
    employee_name: 'Test Worker',
    hours_regular: 40,
    hours_overtime: 5,
    cost_code: 'CC-100',
    pay_rate: 35.0,
    department: 'contracting',
    project_id: null,
    ...overrides,
  };
}

// ─── buildExportBatch ─────────────────────────────────────

describe('buildExportBatch', () => {
  beforeEach(() => vi.clearAllMocks());

  it('aggregates time entries by employee with division filter', async () => {
    const entries = [
      {
        user_id: TEST_USER_1,
        hours_regular: 8,
        hours_overtime: 1,
        cost_code: 'CC-100',
        project_id: TEST_PROJECT_1,
      },
      {
        user_id: TEST_USER_1,
        hours_regular: 8,
        hours_overtime: 0,
        cost_code: 'CC-100',
        project_id: TEST_PROJECT_1,
      },
      {
        user_id: TEST_USER_2,
        hours_regular: 6,
        hours_overtime: 2,
        cost_code: 'CC-200',
        project_id: TEST_PROJECT_2,
      },
    ];

    const supabase = mockSupabaseClient({
      tables: {
        divisions: DIVISION_MOCK,
        projects: PROJECTS_MOCK,
        time_entries: { data: entries, error: null },
        users: USERS_MOCK,
      },
    });

    const rows = await buildExportBatch(supabase as never, {
      periodStart: '2026-03-01',
      periodEnd: '2026-03-15',
      divisionIds: [TEST_DIVISION],
      createdBy: TEST_USER_1,
    });

    expect(rows).toHaveLength(2);
    const user1 = rows.find((r) => r.employee_name === 'Test Worker');
    expect(user1?.hours_regular).toBe(16);
    expect(user1?.hours_overtime).toBe(1);
    expect(user1?.department).toBe('MDM Contracting');
    expect(user1?.employee_name).toBe('Test Worker');
    expect(user1?.employee_id).toBe('E0042');

    const user2 = rows.find((r) => r.employee_id === TEST_USER_2);
    expect(user2?.hours_regular).toBe(6);
    expect(user2?.hours_overtime).toBe(2);
    expect(user2?.employee_id).toBe(TEST_USER_2);
  });

  it('returns empty array when no entries found', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        divisions: DIVISION_MOCK,
        projects: PROJECTS_MOCK,
        time_entries: { data: [], error: null },
        users: USERS_MOCK,
      },
    });

    const rows = await buildExportBatch(supabase as never, {
      periodStart: '2026-03-01',
      periodEnd: '2026-03-15',
      divisionIds: [TEST_DIVISION],
      createdBy: TEST_USER_1,
    });

    expect(rows).toHaveLength(0);
  });

  it('returns empty when no projects match the division', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        divisions: DIVISION_MOCK,
        projects: { data: [], error: null },
        time_entries: { data: [], error: null },
        users: USERS_MOCK,
      },
    });

    const rows = await buildExportBatch(supabase as never, {
      periodStart: '2026-03-01',
      periodEnd: '2026-03-15',
      divisionIds: [TEST_DIVISION],
      createdBy: TEST_USER_1,
    });

    expect(rows).toHaveLength(0);
  });

  it('throws when divisions query fails', async () => {
    const supabase = mockSupabaseClient({
      tables: {
        divisions: { data: null, error: { message: 'Connection refused' } },
        projects: PROJECTS_MOCK,
        time_entries: { data: [], error: null },
        users: USERS_MOCK,
      },
    });

    await expect(
      buildExportBatch(supabase as never, {
        periodStart: '2026-03-01',
        periodEnd: '2026-03-15',
        divisionIds: [TEST_DIVISION],
        createdBy: TEST_USER_1,
      }),
    ).rejects.toThrow('Failed to fetch divisions');
  });
});

// ─── generateCSV ──────────────────────────────────────────

describe('generateCSV', () => {
  it('produces valid CSV with header and data rows', () => {
    const rows = [
      makeExportRow({ hours_regular: 40, hours_overtime: 5 }),
      makeExportRow({ employee_id: TEST_USER_2, hours_regular: 32, hours_overtime: 0 }),
    ];

    const csv = generateCSV(rows);
    const lines = csv.split('\n');

    expect(lines[0]).toBe(
      'Employee ID,Hours - Regular,Hours - Overtime,Cost Code,Pay Rate,Department',
    );
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain('40.00');
    expect(lines[1]).toContain('5.00');
  });

  it('returns header-only CSV when no rows', () => {
    const csv = generateCSV([]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('Employee ID');
  });

  it('escapes commas in field values', () => {
    const rows = [makeExportRow({ cost_code: 'CC,100' })];
    const csv = generateCSV(rows);
    expect(csv).toContain('"CC,100"');
  });
});

// ─── reconcileExport ──────────────────────────────────────

describe('reconcileExport', () => {
  it('identifies matched employees', () => {
    const exportRows = [makeExportRow({ hours_regular: 40, hours_overtime: 5 })];
    const adpCsv = [
      'Employee ID,Hours - Regular,Hours - Overtime',
      `${TEST_USER_1},40.00,5.00`,
    ].join('\n');

    const result = reconcileExport(exportRows, adpCsv);
    expect(result.matched).toBe(1);
    expect(result.mismatched).toBe(0);
    expect(result.missing_in_adp).toBe(0);
    expect(result.missing_in_export).toBe(0);
  });

  it('identifies mismatched hours', () => {
    const exportRows = [makeExportRow({ hours_regular: 40, hours_overtime: 5 })];
    const adpCsv = [
      'Employee ID,Hours - Regular,Hours - Overtime',
      `${TEST_USER_1},38.00,5.00`,
    ].join('\n');

    const result = reconcileExport(exportRows, adpCsv);
    expect(result.mismatched).toBe(1);
    expect(result.details[0].status).toBe('mismatched');
    expect(result.details[0].expected_hours).toBe(45);
    expect(result.details[0].actual_hours).toBe(43);
  });

  it('identifies employees missing in ADP response', () => {
    const exportRows = [
      makeExportRow({ employee_id: TEST_USER_1 }),
      makeExportRow({ employee_id: TEST_USER_2 }),
    ];
    const adpCsv = [
      'Employee ID,Hours - Regular,Hours - Overtime',
      `${TEST_USER_1},40.00,5.00`,
    ].join('\n');

    const result = reconcileExport(exportRows, adpCsv);
    expect(result.matched).toBe(1);
    expect(result.missing_in_adp).toBe(1);
  });

  it('identifies employees in ADP but not in export', () => {
    const exportRows = [makeExportRow({ employee_id: TEST_USER_1 })];
    const adpCsv = [
      'Employee ID,Hours - Regular,Hours - Overtime',
      `${TEST_USER_1},40.00,5.00`,
      `${TEST_USER_2},20.00,0.00`,
    ].join('\n');

    const result = reconcileExport(exportRows, adpCsv);
    expect(result.matched).toBe(1);
    expect(result.missing_in_export).toBe(1);
  });

  it('handles empty ADP CSV gracefully', () => {
    const exportRows = [makeExportRow()];
    const result = reconcileExport(exportRows, '');
    expect(result.missing_in_adp).toBe(1);
    expect(result.matched).toBe(0);
  });
});
