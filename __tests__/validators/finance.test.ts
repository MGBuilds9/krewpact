import { describe, it, expect } from 'vitest';
import {
  invoiceSnapshotSchema,
  poSnapshotSchema,
  jobCostSnapshotSchema,
} from '@/lib/validators/finance';

// ============================================================
// invoiceSnapshotSchema
// ============================================================
describe('invoiceSnapshotSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = invoiceSnapshotSchema.safeParse({
      invoice_number: 'INV-2026-001',
      snapshot_payload: { raw: true },
    });
    expect(result.success).toBe(true);
  });

  it('fails when invoice_number is missing', () => {
    const result = invoiceSnapshotSchema.safeParse({
      snapshot_payload: { raw: true },
    });
    expect(result.success).toBe(false);
  });

  it('fails when snapshot_payload is missing', () => {
    const result = invoiceSnapshotSchema.safeParse({ invoice_number: 'INV-001' });
    expect(result.success).toBe(false);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['draft', 'submitted', 'paid', 'overdue', 'cancelled'] as const;
    for (const status of statuses) {
      expect(
        invoiceSnapshotSchema.safeParse({
          invoice_number: 'INV-001',
          snapshot_payload: {},
          status,
        }).success,
      ).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = invoiceSnapshotSchema.safeParse({
      invoice_number: 'INV-001',
      snapshot_payload: {},
      status: 'pending_payment',
    });
    expect(result.success).toBe(false);
  });

  it('fails when payment_link_url is not a valid URL', () => {
    const result = invoiceSnapshotSchema.safeParse({
      invoice_number: 'INV-001',
      snapshot_payload: {},
      payment_link_url: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid optional numeric fields', () => {
    const result = invoiceSnapshotSchema.safeParse({
      invoice_number: 'INV-2026-001',
      snapshot_payload: {},
      subtotal_amount: 10000.0,
      tax_amount: 1300.0,
      total_amount: 11300.0,
      amount_paid: 5000.0,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// poSnapshotSchema
// ============================================================
describe('poSnapshotSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = poSnapshotSchema.safeParse({
      po_number: 'PO-2026-001',
      snapshot_payload: { items: [] },
    });
    expect(result.success).toBe(true);
  });

  it('fails when po_number is missing', () => {
    const result = poSnapshotSchema.safeParse({ snapshot_payload: {} });
    expect(result.success).toBe(false);
  });

  it('fails when snapshot_payload is missing', () => {
    const result = poSnapshotSchema.safeParse({ po_number: 'PO-001' });
    expect(result.success).toBe(false);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['draft', 'submitted', 'approved', 'received', 'closed', 'cancelled'] as const;
    for (const status of statuses) {
      expect(
        poSnapshotSchema.safeParse({
          po_number: 'PO-001',
          snapshot_payload: {},
          status,
        }).success,
      ).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = poSnapshotSchema.safeParse({
      po_number: 'PO-001',
      snapshot_payload: {},
      status: 'ordered',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// jobCostSnapshotSchema
// ============================================================
describe('jobCostSnapshotSchema', () => {
  it('accepts valid input with required field only', () => {
    const result = jobCostSnapshotSchema.safeParse({ snapshot_date: '2026-02-26' });
    expect(result.success).toBe(true);
  });

  it('fails when snapshot_date is missing', () => {
    const result = jobCostSnapshotSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts all optional cost fields', () => {
    const result = jobCostSnapshotSchema.safeParse({
      snapshot_date: '2026-02-26',
      baseline_budget: 500000,
      revised_budget: 520000,
      committed_cost: 300000,
      actual_cost: 280000,
      forecast_cost: 510000,
      forecast_margin_pct: 1.9,
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional payload record', () => {
    const result = jobCostSnapshotSchema.safeParse({
      snapshot_date: '2026-02-26',
      payload: { cost_by_phase: { foundation: 80000 } },
    });
    expect(result.success).toBe(true);
  });
});
