import { describe, expect, it } from 'vitest';

import {
  closeoutPackageCreateSchema,
  closeoutPackageUpdateSchema,
  deficiencyItemCreateSchema,
  deficiencyItemUpdateSchema,
  serviceCallCreateSchema,
  serviceCallUpdateSchema,
  serviceEventCreateSchema,
  warrantyItemCreateSchema,
} from '@/lib/validators/closeout';

const _VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// closeoutPackageCreateSchema
// ============================================================
describe('closeoutPackageCreateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = closeoutPackageCreateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts optional checklist_payload', () => {
    const result = closeoutPackageCreateSchema.safeParse({
      checklist_payload: { final_inspection: false, as_builts: true },
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// closeoutPackageUpdateSchema
// ============================================================
describe('closeoutPackageUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = closeoutPackageUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['draft', 'in_review', 'client_review', 'accepted', 'rejected'] as const;
    for (const status of statuses) {
      expect(closeoutPackageUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = closeoutPackageUpdateSchema.safeParse({ status: 'complete' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// deficiencyItemCreateSchema
// ============================================================
describe('deficiencyItemCreateSchema', () => {
  it('accepts valid input with required field only', () => {
    const result = deficiencyItemCreateSchema.safeParse({ title: 'Cracked tile in bathroom' });
    expect(result.success).toBe(true);
  });

  it('fails when title is missing', () => {
    const result = deficiencyItemCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when title exceeds 200 characters', () => {
    const result = deficiencyItemCreateSchema.safeParse({ title: 'T'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts valid severity values', () => {
    for (const severity of ['low', 'medium', 'high', 'critical'] as const) {
      expect(deficiencyItemCreateSchema.safeParse({ title: 'Issue', severity }).success).toBe(true);
    }
  });

  it('fails when severity is invalid', () => {
    const result = deficiencyItemCreateSchema.safeParse({ title: 'Issue', severity: 'extreme' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// deficiencyItemUpdateSchema
// ============================================================
describe('deficiencyItemUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = deficiencyItemUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['open', 'in_progress', 'resolved', 'verified', 'closed'] as const;
    for (const status of statuses) {
      expect(deficiencyItemUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = deficiencyItemUpdateSchema.safeParse({ status: 'fixed' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable assigned_to and closed_at', () => {
    const result = deficiencyItemUpdateSchema.safeParse({ assigned_to: null, closed_at: null });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// warrantyItemCreateSchema
// ============================================================
describe('warrantyItemCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = warrantyItemCreateSchema.safeParse({
      title: '1-year structural warranty',
      warranty_start: '2026-03-01',
      warranty_end: '2027-03-01',
    });
    expect(result.success).toBe(true);
  });

  it('fails when title is missing', () => {
    const result = warrantyItemCreateSchema.safeParse({
      warranty_start: '2026-03-01',
      warranty_end: '2027-03-01',
    });
    expect(result.success).toBe(false);
  });

  it('fails when warranty_start is missing', () => {
    const result = warrantyItemCreateSchema.safeParse({
      title: 'Structural warranty',
      warranty_end: '2027-03-01',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional provider_name and terms', () => {
    const result = warrantyItemCreateSchema.safeParse({
      title: 'Roof warranty',
      warranty_start: '2026-03-01',
      warranty_end: '2028-03-01',
      provider_name: 'CertainTeed',
      terms: 'Full material and labour for 2 years.',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// serviceCallCreateSchema
// ============================================================
describe('serviceCallCreateSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = serviceCallCreateSchema.safeParse({
      call_number: 'SC-001',
      title: 'Leaking faucet in master bath',
    });
    expect(result.success).toBe(true);
  });

  it('fails when call_number is missing', () => {
    const result = serviceCallCreateSchema.safeParse({ title: 'Leaking faucet' });
    expect(result.success).toBe(false);
  });

  it('fails when title is missing', () => {
    const result = serviceCallCreateSchema.safeParse({ call_number: 'SC-001' });
    expect(result.success).toBe(false);
  });

  it('accepts valid priority values', () => {
    for (const priority of ['low', 'medium', 'high', 'urgent'] as const) {
      expect(
        serviceCallCreateSchema.safeParse({ call_number: 'SC-001', title: 'Issue', priority })
          .success,
      ).toBe(true);
    }
  });

  it('fails when priority is invalid', () => {
    const result = serviceCallCreateSchema.safeParse({
      call_number: 'SC-001',
      title: 'Issue',
      priority: 'critical',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// serviceCallUpdateSchema
// ============================================================
describe('serviceCallUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = serviceCallUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = [
      'open',
      'scheduled',
      'in_progress',
      'resolved',
      'closed',
      'cancelled',
    ] as const;
    for (const status of statuses) {
      expect(serviceCallUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = serviceCallUpdateSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable resolved_at and closed_at', () => {
    const result = serviceCallUpdateSchema.safeParse({ resolved_at: null, closed_at: null });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// serviceEventCreateSchema
// ============================================================
describe('serviceEventCreateSchema', () => {
  it('accepts valid input with required field only', () => {
    const result = serviceEventCreateSchema.safeParse({ event_type: 'technician_dispatched' });
    expect(result.success).toBe(true);
  });

  it('fails when event_type is missing', () => {
    const result = serviceEventCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when event_type is empty string', () => {
    const result = serviceEventCreateSchema.safeParse({ event_type: '' });
    expect(result.success).toBe(false);
  });

  it('accepts optional event_payload', () => {
    const result = serviceEventCreateSchema.safeParse({
      event_type: 'visit_completed',
      event_payload: { technician: 'Bob', duration_min: 45 },
    });
    expect(result.success).toBe(true);
  });
});
