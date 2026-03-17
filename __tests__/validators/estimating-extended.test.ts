import { describe, expect, it } from 'vitest';

import {
  assemblyCreateSchema,
  assemblyItemCreateSchema,
  costCatalogItemCreateSchema,
  costCatalogItemUpdateSchema,
  estimateAllowanceCreateSchema,
  estimateAlternateCreateSchema,
  estimateTemplateCreateSchema,
} from '@/lib/validators/estimating';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// costCatalogItemCreateSchema
// ============================================================
describe('costCatalogItemCreateSchema', () => {
  it('accepts valid item with required fields only', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      item_name: 'Framing Lumber',
      item_type: 'material',
      unit: 'bf',
      base_cost: 2.5,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid item with all optional fields', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      division_id: VALID_UUID,
      item_code: 'LBR-001',
      item_name: 'Framing Lumber',
      item_type: 'material',
      unit: 'bf',
      base_cost: 2.5,
      vendor_name: 'Rona Inc.',
      effective_from: '2026-01-01',
      effective_to: '2026-12-31',
      metadata: { grade: 'SPF' },
    });
    expect(result.success).toBe(true);
  });

  it('fails when item_name is missing', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      item_type: 'material',
      unit: 'bf',
      base_cost: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it('fails when item_name is empty string', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      item_name: '',
      item_type: 'material',
      unit: 'bf',
      base_cost: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it('fails when item_type is an invalid value', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      item_name: 'Test',
      item_type: 'invalid_type',
      unit: 'ea',
      base_cost: 10,
    });
    expect(result.success).toBe(false);
  });

  it('fails when unit is missing', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      item_name: 'Test',
      item_type: 'labor',
      base_cost: 50,
    });
    expect(result.success).toBe(false);
  });

  it('fails when unit is empty string', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      item_name: 'Test',
      item_type: 'labor',
      unit: '',
      base_cost: 50,
    });
    expect(result.success).toBe(false);
  });

  it('fails when base_cost is negative', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      item_name: 'Test',
      item_type: 'material',
      unit: 'ea',
      base_cost: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts base_cost of zero', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      item_name: 'Free Sample',
      item_type: 'other',
      unit: 'ea',
      base_cost: 0,
    });
    expect(result.success).toBe(true);
  });

  it('fails when item_code exceeds 50 chars', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      item_name: 'Test',
      item_type: 'material',
      unit: 'ea',
      base_cost: 10,
      item_code: 'A'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid date strings for effective_from and effective_to', () => {
    const result = costCatalogItemCreateSchema.safeParse({
      item_name: 'Seasonal Rate',
      item_type: 'labor',
      unit: 'hr',
      base_cost: 75,
      effective_from: '2026-01-01',
      effective_to: '2026-06-30',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid item_type enum values', () => {
    const types = ['material', 'labor', 'equipment', 'subcontract', 'other'] as const;
    for (const item_type of types) {
      const result = costCatalogItemCreateSchema.safeParse({
        item_name: 'Test',
        item_type,
        unit: 'ea',
        base_cost: 10,
      });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================
// costCatalogItemUpdateSchema
// ============================================================
describe('costCatalogItemUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = costCatalogItemUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with item_name only', () => {
    const result = costCatalogItemUpdateSchema.safeParse({
      item_name: 'Updated Lumber Name',
    });
    expect(result.success).toBe(true);
  });

  it('accepts nullable fields', () => {
    const result = costCatalogItemUpdateSchema.safeParse({
      division_id: null,
      item_code: null,
      vendor_name: null,
      effective_to: null,
    });
    expect(result.success).toBe(true);
  });

  it('fails for negative base_cost', () => {
    const result = costCatalogItemUpdateSchema.safeParse({
      base_cost: -10,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// assemblyCreateSchema
// ============================================================
describe('assemblyCreateSchema', () => {
  it('accepts valid assembly with required fields only', () => {
    const result = assemblyCreateSchema.safeParse({
      assembly_name: 'Standard Framing Package',
      unit: 'sqft',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid assembly with all optional fields', () => {
    const result = assemblyCreateSchema.safeParse({
      division_id: VALID_UUID,
      assembly_code: 'FRM-001',
      assembly_name: 'Standard Framing Package',
      description: 'Includes lumber, hardware, and labour for standard wall framing.',
      unit: 'sqft',
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it('fails when assembly_name is missing', () => {
    const result = assemblyCreateSchema.safeParse({
      unit: 'sqft',
    });
    expect(result.success).toBe(false);
  });

  it('fails when unit is missing', () => {
    const result = assemblyCreateSchema.safeParse({
      assembly_name: 'Framing Package',
    });
    expect(result.success).toBe(false);
  });

  it('accepts description as optional', () => {
    const withDesc = assemblyCreateSchema.safeParse({
      assembly_name: 'Package A',
      unit: 'ea',
      description: 'Some description',
    });
    const withoutDesc = assemblyCreateSchema.safeParse({
      assembly_name: 'Package A',
      unit: 'ea',
    });
    expect(withDesc.success).toBe(true);
    expect(withoutDesc.success).toBe(true);
  });

  it('fails when assembly_name is empty string', () => {
    const result = assemblyCreateSchema.safeParse({
      assembly_name: '',
      unit: 'ea',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// assemblyItemCreateSchema
// ============================================================
describe('assemblyItemCreateSchema', () => {
  it('accepts valid item with required fields only', () => {
    const result = assemblyItemCreateSchema.safeParse({
      line_type: 'material',
      quantity: 10,
      unit_cost: 25,
    });
    expect(result.success).toBe(true);
  });

  it('fails when quantity is zero', () => {
    const result = assemblyItemCreateSchema.safeParse({
      line_type: 'labor',
      quantity: 0,
      unit_cost: 50,
    });
    expect(result.success).toBe(false);
  });

  it('fails when quantity is negative', () => {
    const result = assemblyItemCreateSchema.safeParse({
      line_type: 'labor',
      quantity: -5,
      unit_cost: 50,
    });
    expect(result.success).toBe(false);
  });

  it('fails when unit_cost is negative', () => {
    const result = assemblyItemCreateSchema.safeParse({
      line_type: 'material',
      quantity: 5,
      unit_cost: -10,
    });
    expect(result.success).toBe(false);
  });

  it('accepts catalog_item_id as optional UUID', () => {
    const result = assemblyItemCreateSchema.safeParse({
      catalog_item_id: VALID_UUID,
      line_type: 'material',
      quantity: 3,
      unit_cost: 15,
    });
    expect(result.success).toBe(true);
  });

  it('fails for invalid catalog_item_id UUID', () => {
    const result = assemblyItemCreateSchema.safeParse({
      catalog_item_id: 'not-a-uuid',
      line_type: 'material',
      quantity: 3,
      unit_cost: 15,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// estimateTemplateCreateSchema
// ============================================================
describe('estimateTemplateCreateSchema', () => {
  it('accepts valid template with required fields only', () => {
    const result = estimateTemplateCreateSchema.safeParse({
      template_name: 'Residential Renovation',
      payload: { lines: [] },
    });
    expect(result.success).toBe(true);
  });

  it('fails when template_name is missing', () => {
    const result = estimateTemplateCreateSchema.safeParse({
      payload: { lines: [] },
    });
    expect(result.success).toBe(false);
  });

  it('fails when payload is missing', () => {
    const result = estimateTemplateCreateSchema.safeParse({
      template_name: 'My Template',
    });
    expect(result.success).toBe(false);
  });

  it('accepts project_type as optional string', () => {
    const result = estimateTemplateCreateSchema.safeParse({
      template_name: 'Commercial Shell',
      payload: { lines: [] },
      project_type: 'commercial',
    });
    expect(result.success).toBe(true);
  });

  it('accepts is_default as optional boolean', () => {
    const result = estimateTemplateCreateSchema.safeParse({
      template_name: 'Default Template',
      payload: { lines: [] },
      is_default: true,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// estimateAlternateCreateSchema
// ============================================================
describe('estimateAlternateCreateSchema', () => {
  it('accepts valid alternate with required fields only', () => {
    const result = estimateAlternateCreateSchema.safeParse({
      title: 'Upgraded Flooring',
      amount: 4500,
    });
    expect(result.success).toBe(true);
  });

  it('fails when title is missing', () => {
    const result = estimateAlternateCreateSchema.safeParse({
      amount: 4500,
    });
    expect(result.success).toBe(false);
  });

  it('accepts negative amount (credit alternate)', () => {
    const result = estimateAlternateCreateSchema.safeParse({
      title: 'Omit Premium Fixtures',
      amount: -2000,
    });
    expect(result.success).toBe(true);
  });

  it('accepts selected as optional boolean', () => {
    const result = estimateAlternateCreateSchema.safeParse({
      title: 'Base Grade Flooring',
      amount: 2500,
      selected: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts description as optional', () => {
    const result = estimateAlternateCreateSchema.safeParse({
      title: 'Premium Package',
      amount: 8000,
      description: 'Includes all premium upgrades',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// estimateAllowanceCreateSchema
// ============================================================
describe('estimateAllowanceCreateSchema', () => {
  it('accepts valid allowance with required fields only', () => {
    const result = estimateAllowanceCreateSchema.safeParse({
      allowance_name: 'Owner Supplied Fixtures',
      allowance_amount: 5000,
    });
    expect(result.success).toBe(true);
  });

  it('fails when allowance_name is missing', () => {
    const result = estimateAllowanceCreateSchema.safeParse({
      allowance_amount: 5000,
    });
    expect(result.success).toBe(false);
  });

  it('fails when allowance_amount is negative', () => {
    const result = estimateAllowanceCreateSchema.safeParse({
      allowance_name: 'Fixtures',
      allowance_amount: -500,
    });
    expect(result.success).toBe(false);
  });

  it('accepts notes as optional', () => {
    const result = estimateAllowanceCreateSchema.safeParse({
      allowance_name: 'Tile Allowance',
      allowance_amount: 3000,
      notes: 'Client selects tile from approved vendor list',
    });
    expect(result.success).toBe(true);
  });

  it('accepts allowance_amount of zero', () => {
    const result = estimateAllowanceCreateSchema.safeParse({
      allowance_name: 'Placeholder Allowance',
      allowance_amount: 0,
    });
    expect(result.success).toBe(true);
  });
});
