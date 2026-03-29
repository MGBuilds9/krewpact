/**
 * Tests for payroll Zod validators
 */

import { describe, expect, it } from 'vitest';

import {
  adpFieldMappingSchema,
  payrollExportCreateSchema,
  payrollExportQuerySchema,
  payrollExportRowSchema,
  payrollReconcileSchema,
} from '@/lib/validators/payroll';

describe('payrollExportCreateSchema', () => {
  it('validates correct input', () => {
    const result = payrollExportCreateSchema.safeParse({
      period_start: '2026-03-01',
      period_end: '2026-03-15',
      division_ids: ['00000000-0000-4000-a000-000000000010'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty period_start', () => {
    const result = payrollExportCreateSchema.safeParse({
      period_start: '',
      period_end: '2026-03-15',
      division_ids: ['00000000-0000-4000-a000-000000000010'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty division_ids', () => {
    const result = payrollExportCreateSchema.safeParse({
      period_start: '2026-03-01',
      period_end: '2026-03-15',
      division_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUIDs in division_ids', () => {
    const result = payrollExportCreateSchema.safeParse({
      period_start: '2026-03-01',
      period_end: '2026-03-15',
      division_ids: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('accepts multiple division_ids', () => {
    const result = payrollExportCreateSchema.safeParse({
      period_start: '2026-03-01',
      period_end: '2026-03-15',
      division_ids: [
        '00000000-0000-4000-a000-000000000010',
        '00000000-0000-4000-a000-000000000020',
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe('payrollExportQuerySchema', () => {
  it('validates empty query', () => {
    const result = payrollExportQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates status filter', () => {
    const result = payrollExportQuerySchema.safeParse({ status: 'completed' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status', () => {
    const result = payrollExportQuerySchema.safeParse({ status: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('validates division_id', () => {
    const result = payrollExportQuerySchema.safeParse({
      division_id: '00000000-0000-4000-a000-000000000010',
    });
    expect(result.success).toBe(true);
  });

  it('coerces string limit to number', () => {
    const result = payrollExportQuerySchema.safeParse({ limit: '25' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
    }
  });
});

describe('payrollReconcileSchema', () => {
  it('validates correct input', () => {
    const result = payrollReconcileSchema.safeParse({
      csv_content: 'Employee ID,Hours\nemp-001,40',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty csv_content', () => {
    const result = payrollReconcileSchema.safeParse({ csv_content: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing csv_content', () => {
    const result = payrollReconcileSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('adpFieldMappingSchema', () => {
  it('validates correct input', () => {
    const result = adpFieldMappingSchema.safeParse({
      internal_field: 'employee_id',
      adp_field: 'Employee ID',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional transform_rule', () => {
    const result = adpFieldMappingSchema.safeParse({
      internal_field: 'employee_id',
      adp_field: 'Employee ID',
      transform_rule: 'uppercase',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty internal_field', () => {
    const result = adpFieldMappingSchema.safeParse({
      internal_field: '',
      adp_field: 'Employee ID',
    });
    expect(result.success).toBe(false);
  });
});

describe('payrollExportRowSchema', () => {
  it('validates minimal row', () => {
    const result = payrollExportRowSchema.safeParse({
      employee_id: 'emp-001',
      hours_regular: 40,
      hours_overtime: 5,
    });
    expect(result.success).toBe(true);
  });

  it('validates full row', () => {
    const result = payrollExportRowSchema.safeParse({
      employee_id: 'emp-001',
      employee_name: 'Worker A',
      hours_regular: 40,
      hours_overtime: 5,
      cost_code: 'CC-100',
      pay_rate: 35.0,
      department: 'contracting',
      project_id: '00000000-0000-4000-a000-000000000001',
    });
    expect(result.success).toBe(true);
  });

  it('rejects negative hours', () => {
    const result = payrollExportRowSchema.safeParse({
      employee_id: 'emp-001',
      hours_regular: -5,
      hours_overtime: 0,
    });
    expect(result.success).toBe(false);
  });
});
