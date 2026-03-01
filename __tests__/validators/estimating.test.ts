import { describe, it, expect } from 'vitest';
import {
  estimateCreateSchema,
  estimateUpdateSchema,
  estimateLineCreateSchema,
  estimateLineUpdateSchema,
  estimateLineBatchUpdateSchema,
} from '@/lib/validators/estimating';

// Valid v4 UUIDs for Zod validation (TEST_IDS fail strict UUID check)
const VALID_UUID_1 = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const VALID_UUID_2 = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const VALID_UUID_3 = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

describe('estimateCreateSchema', () => {
  it('accepts valid estimate with required fields only', () => {
    const result = estimateCreateSchema.safeParse({
      division_id: VALID_UUID_1,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid estimate with all optional fields', () => {
    const result = estimateCreateSchema.safeParse({
      division_id: VALID_UUID_1,
      opportunity_id: VALID_UUID_2,
      account_id: VALID_UUID_3,
      contact_id: VALID_UUID_1,
      currency_code: 'USD',
    });
    expect(result.success).toBe(true);
  });

  it('fails when division_id is missing', () => {
    const result = estimateCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when division_id is not a valid UUID', () => {
    const result = estimateCreateSchema.safeParse({
      division_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('defaults currency_code to CAD when not provided', () => {
    const result = estimateCreateSchema.safeParse({
      division_id: VALID_UUID_1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency_code).toBe('CAD');
    }
  });

  it('fails when opportunity_id is not a valid UUID', () => {
    const result = estimateCreateSchema.safeParse({
      division_id: VALID_UUID_1,
      opportunity_id: 'bad-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('estimateUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = estimateUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with division_id', () => {
    const result = estimateUpdateSchema.safeParse({
      division_id: VALID_UUID_1,
    });
    expect(result.success).toBe(true);
  });

  it('accepts nullable fields', () => {
    const result = estimateUpdateSchema.safeParse({
      opportunity_id: null,
      account_id: null,
      contact_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('fails for invalid UUID in optional field', () => {
    const result = estimateUpdateSchema.safeParse({
      account_id: 'not-valid',
    });
    expect(result.success).toBe(false);
  });
});

describe('estimateLineCreateSchema', () => {
  it('accepts valid line with required fields only', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Labour — Framing crew',
      quantity: 40,
      unit_cost: 75,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid line with all optional fields', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Material — Lumber',
      quantity: 100,
      unit_cost: 25.50,
      parent_line_id: VALID_UUID_1,
      line_type: 'material',
      unit: 'bf',
      markup_pct: 15,
      is_optional: true,
      sort_order: 5,
    });
    expect(result.success).toBe(true);
  });

  it('fails when description is missing', () => {
    const result = estimateLineCreateSchema.safeParse({
      quantity: 10,
      unit_cost: 50,
    });
    expect(result.success).toBe(false);
  });

  it('fails when quantity is missing', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Test line',
      unit_cost: 50,
    });
    expect(result.success).toBe(false);
  });

  it('fails when unit_cost is missing', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Test line',
      quantity: 10,
    });
    expect(result.success).toBe(false);
  });

  it('fails when description is empty string', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: '',
      quantity: 10,
      unit_cost: 50,
    });
    expect(result.success).toBe(false);
  });

  it('fails when description exceeds 500 chars', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'A'.repeat(501),
      quantity: 10,
      unit_cost: 50,
    });
    expect(result.success).toBe(false);
  });

  it('fails when quantity is zero or negative', () => {
    const negResult = estimateLineCreateSchema.safeParse({
      description: 'Test',
      quantity: -1,
      unit_cost: 50,
    });
    expect(negResult.success).toBe(false);

    const zeroResult = estimateLineCreateSchema.safeParse({
      description: 'Test',
      quantity: 0,
      unit_cost: 50,
    });
    expect(zeroResult.success).toBe(false);
  });

  it('fails when unit_cost is negative', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Test',
      quantity: 10,
      unit_cost: -5,
    });
    expect(result.success).toBe(false);
  });

  it('accepts unit_cost of zero', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'No-cost item',
      quantity: 1,
      unit_cost: 0,
    });
    expect(result.success).toBe(true);
  });

  it('fails when markup_pct exceeds 100', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Test',
      quantity: 10,
      unit_cost: 50,
      markup_pct: 101,
    });
    expect(result.success).toBe(false);
  });

  it('fails when markup_pct is negative', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Test',
      quantity: 10,
      unit_cost: 50,
      markup_pct: -5,
    });
    expect(result.success).toBe(false);
  });

  it('defaults line_type to item', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Test',
      quantity: 10,
      unit_cost: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.line_type).toBe('item');
    }
  });

  it('defaults markup_pct to 0', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Test',
      quantity: 10,
      unit_cost: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.markup_pct).toBe(0);
    }
  });

  it('defaults is_optional to false', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Test',
      quantity: 10,
      unit_cost: 50,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_optional).toBe(false);
    }
  });

  it('fails for invalid parent_line_id UUID', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Test',
      quantity: 10,
      unit_cost: 50,
      parent_line_id: 'bad',
    });
    expect(result.success).toBe(false);
  });

  it('accepts fractional quantity', () => {
    const result = estimateLineCreateSchema.safeParse({
      description: 'Test',
      quantity: 2.5,
      unit_cost: 33.33,
    });
    expect(result.success).toBe(true);
  });
});

describe('estimateLineUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = estimateLineUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update', () => {
    const result = estimateLineUpdateSchema.safeParse({
      quantity: 20,
      unit_cost: 100,
    });
    expect(result.success).toBe(true);
  });

  it('fails for negative quantity', () => {
    const result = estimateLineUpdateSchema.safeParse({
      quantity: -5,
    });
    expect(result.success).toBe(false);
  });

  it('fails for markup_pct > 100', () => {
    const result = estimateLineUpdateSchema.safeParse({
      markup_pct: 150,
    });
    expect(result.success).toBe(false);
  });
});

describe('estimateLineBatchUpdateSchema', () => {
  it('accepts array of line objects with id', () => {
    const result = estimateLineBatchUpdateSchema.safeParse([
      {
        id: VALID_UUID_1,
        description: 'Updated line 1',
        quantity: 10,
        unit_cost: 50,
      },
      {
        id: VALID_UUID_2,
        description: 'Updated line 2',
        quantity: 5,
        unit_cost: 100,
      },
    ]);
    expect(result.success).toBe(true);
  });

  it('fails when id is missing from a line', () => {
    const result = estimateLineBatchUpdateSchema.safeParse([
      {
        description: 'No ID line',
        quantity: 10,
        unit_cost: 50,
      },
    ]);
    expect(result.success).toBe(false);
  });

  it('accepts empty array', () => {
    const result = estimateLineBatchUpdateSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('fails when a line has invalid field', () => {
    const result = estimateLineBatchUpdateSchema.safeParse([
      {
        id: VALID_UUID_1,
        quantity: -5, // invalid
      },
    ]);
    expect(result.success).toBe(false);
  });
});
