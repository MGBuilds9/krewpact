import { describe, expect, it } from 'vitest';

import {
  bidLevelingEntrySchema,
  bidLevelingSessionSchema,
  complianceDocCreateSchema,
  complianceDocUpdateSchema,
  costCodeCreateSchema,
  costCodeMappingSchema,
  costCodeUpdateSchema,
  rfqBidCreateSchema,
  rfqInviteSchema,
  rfqPackageCreateSchema,
  rfqPackageUpdateSchema,
} from '@/lib/validators/procurement';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// rfqPackageCreateSchema
// ============================================================
describe('rfqPackageCreateSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = rfqPackageCreateSchema.safeParse({
      rfq_number: 'RFQ-2026-001',
      title: 'Structural Steel Supply',
    });
    expect(result.success).toBe(true);
  });

  it('fails when rfq_number is missing', () => {
    const result = rfqPackageCreateSchema.safeParse({ title: 'Steel Supply' });
    expect(result.success).toBe(false);
  });

  it('fails when title is missing', () => {
    const result = rfqPackageCreateSchema.safeParse({ rfq_number: 'RFQ-001' });
    expect(result.success).toBe(false);
  });

  it('fails when title exceeds 200 characters', () => {
    const result = rfqPackageCreateSchema.safeParse({
      rfq_number: 'RFQ-001',
      title: 'T'.repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// rfqPackageUpdateSchema
// ============================================================
describe('rfqPackageUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = rfqPackageUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['draft', 'issued', 'closed', 'awarded', 'cancelled'] as const;
    for (const status of statuses) {
      expect(rfqPackageUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = rfqPackageUpdateSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable scope_summary', () => {
    const result = rfqPackageUpdateSchema.safeParse({ scope_summary: null });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// rfqInviteSchema
// ============================================================
describe('rfqInviteSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = rfqInviteSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid invited_email', () => {
    const result = rfqInviteSchema.safeParse({ invited_email: 'trade@example.com' });
    expect(result.success).toBe(true);
  });

  it('fails when invited_email is invalid format', () => {
    const result = rfqInviteSchema.safeParse({ invited_email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('accepts valid portal_account_id UUID', () => {
    const result = rfqInviteSchema.safeParse({ portal_account_id: VALID_UUID });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// rfqBidCreateSchema
// ============================================================
describe('rfqBidCreateSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = rfqBidCreateSchema.safeParse({
      subtotal_amount: 45000,
      total_amount: 50850,
    });
    expect(result.success).toBe(true);
  });

  it('fails when subtotal_amount is missing', () => {
    const result = rfqBidCreateSchema.safeParse({ total_amount: 50850 });
    expect(result.success).toBe(false);
  });

  it('fails when subtotal_amount is negative', () => {
    const result = rfqBidCreateSchema.safeParse({
      subtotal_amount: -1,
      total_amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional currency_code with 3 characters', () => {
    const result = rfqBidCreateSchema.safeParse({
      subtotal_amount: 45000,
      total_amount: 50850,
      currency_code: 'CAD',
    });
    expect(result.success).toBe(true);
  });

  it('fails when currency_code length is not 3', () => {
    const result = rfqBidCreateSchema.safeParse({
      subtotal_amount: 45000,
      total_amount: 50850,
      currency_code: 'CA',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// bidLevelingSessionSchema
// ============================================================
describe('bidLevelingSessionSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = bidLevelingSessionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts optional notes', () => {
    const result = bidLevelingSessionSchema.safeParse({ notes: 'Three bids received.' });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// bidLevelingEntrySchema
// ============================================================
describe('bidLevelingEntrySchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = bidLevelingEntrySchema.safeParse({
      bid_id: VALID_UUID,
      normalized_total: 52000,
    });
    expect(result.success).toBe(true);
  });

  it('fails when bid_id is missing', () => {
    const result = bidLevelingEntrySchema.safeParse({ normalized_total: 52000 });
    expect(result.success).toBe(false);
  });

  it('fails when normalized_total is negative', () => {
    const result = bidLevelingEntrySchema.safeParse({
      bid_id: VALID_UUID,
      normalized_total: -100,
    });
    expect(result.success).toBe(false);
  });

  it('fails when risk_score exceeds 100', () => {
    const result = bidLevelingEntrySchema.safeParse({
      bid_id: VALID_UUID,
      normalized_total: 52000,
      risk_score: 101,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// complianceDocCreateSchema
// ============================================================
describe('complianceDocCreateSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = complianceDocCreateSchema.safeParse({
      portal_account_id: VALID_UUID,
      compliance_type: 'wsib',
    });
    expect(result.success).toBe(true);
  });

  it('fails when portal_account_id is missing', () => {
    const result = complianceDocCreateSchema.safeParse({ compliance_type: 'wsib' });
    expect(result.success).toBe(false);
  });

  it('fails when compliance_type is empty string', () => {
    const result = complianceDocCreateSchema.safeParse({
      portal_account_id: VALID_UUID,
      compliance_type: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional file_id, doc_number, dates', () => {
    const result = complianceDocCreateSchema.safeParse({
      portal_account_id: VALID_UUID,
      compliance_type: 'coi',
      file_id: VALID_UUID,
      doc_number: 'COI-2026-001',
      issued_on: '2026-01-01',
      expires_on: '2027-01-01',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// complianceDocUpdateSchema
// ============================================================
describe('complianceDocUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = complianceDocUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['valid', 'expiring', 'expired', 'rejected'] as const;
    for (const status of statuses) {
      expect(complianceDocUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = complianceDocUpdateSchema.safeParse({ status: 'active' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// costCodeCreateSchema
// ============================================================
describe('costCodeCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = costCodeCreateSchema.safeParse({
      division_id: VALID_UUID,
      cost_code: '03-100',
      cost_code_name: 'Concrete Forming',
    });
    expect(result.success).toBe(true);
  });

  it('fails when division_id is missing', () => {
    const result = costCodeCreateSchema.safeParse({
      cost_code: '03-100',
      cost_code_name: 'Concrete Forming',
    });
    expect(result.success).toBe(false);
  });

  it('fails when cost_code is empty string', () => {
    const result = costCodeCreateSchema.safeParse({
      division_id: VALID_UUID,
      cost_code: '',
      cost_code_name: 'Concrete',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// costCodeUpdateSchema
// ============================================================
describe('costCodeUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = costCodeUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts is_active boolean', () => {
    const result = costCodeUpdateSchema.safeParse({ is_active: false });
    expect(result.success).toBe(true);
  });

  it('accepts cost_code_name update', () => {
    const result = costCodeUpdateSchema.safeParse({ cost_code_name: 'Updated Name' });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// costCodeMappingSchema
// ============================================================
describe('costCodeMappingSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = costCodeMappingSchema.safeParse({
      division_id: VALID_UUID,
      local_cost_code: '03-100',
      erp_cost_code: 'ERP-CONC-100',
    });
    expect(result.success).toBe(true);
  });

  it('fails when division_id is missing', () => {
    const result = costCodeMappingSchema.safeParse({
      local_cost_code: '03-100',
      erp_cost_code: 'ERP-CONC-100',
    });
    expect(result.success).toBe(false);
  });

  it('fails when erp_cost_code is empty string', () => {
    const result = costCodeMappingSchema.safeParse({
      division_id: VALID_UUID,
      local_cost_code: '03-100',
      erp_cost_code: '',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional adp_labor_code', () => {
    const result = costCodeMappingSchema.safeParse({
      division_id: VALID_UUID,
      local_cost_code: '03-100',
      erp_cost_code: 'ERP-CONC-100',
      adp_labor_code: 'ADP-LAB-03',
    });
    expect(result.success).toBe(true);
  });
});
