import { describe, it, expect } from 'vitest';
import {
  selectionSheetCreateSchema,
  selectionSheetUpdateSchema,
  selectionOptionSchema,
  selectionChoiceSchema,
  allowanceReconciliationSchema,
} from '@/lib/validators/selections';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// selectionSheetCreateSchema
// ============================================================
describe('selectionSheetCreateSchema', () => {
  it('accepts valid input with required field', () => {
    const result = selectionSheetCreateSchema.safeParse({ sheet_name: 'Kitchen Finishes' });
    expect(result.success).toBe(true);
  });

  it('fails when sheet_name is missing', () => {
    const result = selectionSheetCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when sheet_name is empty string', () => {
    const result = selectionSheetCreateSchema.safeParse({ sheet_name: '' });
    expect(result.success).toBe(false);
  });

  it('fails when sheet_name exceeds 200 characters', () => {
    const result = selectionSheetCreateSchema.safeParse({ sheet_name: 'S'.repeat(201) });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// selectionSheetUpdateSchema
// ============================================================
describe('selectionSheetUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = selectionSheetUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['draft', 'issued', 'client_review', 'approved', 'locked'] as const;
    for (const status of statuses) {
      expect(selectionSheetUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = selectionSheetUpdateSchema.safeParse({ status: 'finalized' });
    expect(result.success).toBe(false);
  });

  it('accepts partial update with sheet_name only', () => {
    const result = selectionSheetUpdateSchema.safeParse({ sheet_name: 'Updated Name' });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// selectionOptionSchema
// ============================================================
describe('selectionOptionSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = selectionOptionSchema.safeParse({
      option_group: 'Flooring',
      option_name: 'Hardwood Oak',
    });
    expect(result.success).toBe(true);
  });

  it('fails when option_group is missing', () => {
    const result = selectionOptionSchema.safeParse({ option_name: 'Hardwood Oak' });
    expect(result.success).toBe(false);
  });

  it('fails when option_name is missing', () => {
    const result = selectionOptionSchema.safeParse({ option_group: 'Flooring' });
    expect(result.success).toBe(false);
  });

  it('fails when allowance_amount is negative', () => {
    const result = selectionOptionSchema.safeParse({
      option_group: 'Flooring',
      option_name: 'Tile',
      allowance_amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional allowance_amount, upgrade_amount, sort_order', () => {
    const result = selectionOptionSchema.safeParse({
      option_group: 'Flooring',
      option_name: 'Hardwood Oak',
      allowance_amount: 5000,
      upgrade_amount: 2500,
      sort_order: 1,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// selectionChoiceSchema
// ============================================================
describe('selectionChoiceSchema', () => {
  it('accepts valid input with required field only', () => {
    const result = selectionChoiceSchema.safeParse({ selection_option_id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('fails when selection_option_id is missing', () => {
    const result = selectionChoiceSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when selection_option_id is not a valid UUID', () => {
    const result = selectionChoiceSchema.safeParse({ selection_option_id: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('fails when quantity is negative', () => {
    const result = selectionChoiceSchema.safeParse({
      selection_option_id: VALID_UUID,
      quantity: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional quantity and notes', () => {
    const result = selectionChoiceSchema.safeParse({
      selection_option_id: VALID_UUID,
      quantity: 3,
      notes: 'Client preferred the matte finish.',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// allowanceReconciliationSchema
// ============================================================
describe('allowanceReconciliationSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = allowanceReconciliationSchema.safeParse({
      category_name: 'Flooring',
      allowance_budget: 8000,
      selected_cost: 9500,
      variance: 1500,
    });
    expect(result.success).toBe(true);
  });

  it('fails when category_name is missing', () => {
    const result = allowanceReconciliationSchema.safeParse({
      allowance_budget: 8000,
      selected_cost: 9500,
      variance: 1500,
    });
    expect(result.success).toBe(false);
  });

  it('fails when allowance_budget is negative', () => {
    const result = allowanceReconciliationSchema.safeParse({
      category_name: 'Flooring',
      allowance_budget: -100,
      selected_cost: 0,
      variance: 0,
    });
    expect(result.success).toBe(false);
  });

  it('accepts negative variance (under budget)', () => {
    const result = allowanceReconciliationSchema.safeParse({
      category_name: 'Flooring',
      allowance_budget: 8000,
      selected_cost: 6000,
      variance: -2000,
    });
    expect(result.success).toBe(true);
  });
});
