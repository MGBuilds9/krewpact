import { describe, it, expect } from 'vitest';
import {
  referenceDataSetSchema,
  referenceDataValueSchema,
} from '@/lib/validators/governance';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// referenceDataSetSchema
// ============================================================
describe('referenceDataSetSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = referenceDataSetSchema.safeParse({
      set_key: 'project_types',
      set_name: 'Project Types',
    });
    expect(result.success).toBe(true);
  });

  it('fails when set_key is missing', () => {
    const result = referenceDataSetSchema.safeParse({ set_name: 'Project Types' });
    expect(result.success).toBe(false);
  });

  it('fails when set_name is missing', () => {
    const result = referenceDataSetSchema.safeParse({ set_key: 'project_types' });
    expect(result.success).toBe(false);
  });

  it('accepts valid status enum values', () => {
    const statuses = ['draft', 'active', 'deprecated', 'archived'] as const;
    for (const status of statuses) {
      expect(referenceDataSetSchema.safeParse({
        set_key: 'project_types',
        set_name: 'Project Types',
        status,
      }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = referenceDataSetSchema.safeParse({
      set_key: 'project_types',
      set_name: 'Project Types',
      status: 'inactive',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// referenceDataValueSchema
// ============================================================
describe('referenceDataValueSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = referenceDataValueSchema.safeParse({
      data_set_id: VALID_UUID,
      value_key: 'residential',
      value_name: 'Residential Construction',
    });
    expect(result.success).toBe(true);
  });

  it('fails when data_set_id is missing', () => {
    const result = referenceDataValueSchema.safeParse({
      value_key: 'residential',
      value_name: 'Residential Construction',
    });
    expect(result.success).toBe(false);
  });

  it('fails when data_set_id is not a valid UUID', () => {
    const result = referenceDataValueSchema.safeParse({
      data_set_id: 'not-a-uuid',
      value_key: 'residential',
      value_name: 'Residential',
    });
    expect(result.success).toBe(false);
  });

  it('fails when value_key is empty string', () => {
    const result = referenceDataValueSchema.safeParse({
      data_set_id: VALID_UUID,
      value_key: '',
      value_name: 'Residential',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional sort_order, metadata, and is_active', () => {
    const result = referenceDataValueSchema.safeParse({
      data_set_id: VALID_UUID,
      value_key: 'commercial',
      value_name: 'Commercial Construction',
      sort_order: 2,
      metadata: { icon: 'building', color: '#0066CC' },
      is_active: true,
    });
    expect(result.success).toBe(true);
  });
});
