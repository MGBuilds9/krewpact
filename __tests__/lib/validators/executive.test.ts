import { describe, expect, it } from 'vitest';

import {
  stagingBulkImportSchema,
  stagingCreateSchema,
  stagingUpdateSchema,
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
} from '@/lib/validators/executive';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// stagingCreateSchema
// ============================================================
describe('stagingCreateSchema', () => {
  it('accepts valid staging document with all fields', () => {
    const result = stagingCreateSchema.safeParse({
      title: 'HR Onboarding SOP',
      raw_content: 'Step 1: ...',
      source_type: 'vault_import',
      category: 'sop',
      tags: ['governance', 'hr'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts minimal required fields', () => {
    const result = stagingCreateSchema.safeParse({
      title: 'Doc',
      raw_content: 'Content here',
      source_type: 'upload',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional division_id as valid UUID', () => {
    const result = stagingCreateSchema.safeParse({
      title: 'Strategy Doc',
      raw_content: 'Content',
      source_type: 'url_scrape',
      division_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = stagingCreateSchema.safeParse({
      title: '',
      raw_content: 'Content',
      source_type: 'vault_import',
    });
    expect(result.success).toBe(false);
  });

  it('rejects title exceeding 500 characters', () => {
    const result = stagingCreateSchema.safeParse({
      title: 'a'.repeat(501),
      raw_content: 'Content',
      source_type: 'vault_import',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty raw_content', () => {
    const result = stagingCreateSchema.safeParse({
      title: 'Doc',
      raw_content: '',
      source_type: 'vault_import',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid source_type', () => {
    const result = stagingCreateSchema.safeParse({
      title: 'Doc',
      raw_content: 'Content',
      source_type: 'manual_entry',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid division_id (not a UUID)', () => {
    const result = stagingCreateSchema.safeParse({
      title: 'Doc',
      raw_content: 'Content',
      source_type: 'upload',
      division_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// stagingUpdateSchema
// ============================================================
describe('stagingUpdateSchema', () => {
  it('accepts status transition to approved with review_notes', () => {
    const result = stagingUpdateSchema.safeParse({
      status: 'approved',
      review_notes: 'Looks good, approved for ingestion.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts edited_content with status needs_edit', () => {
    const result = stagingUpdateSchema.safeParse({
      edited_content: 'Revised content here.',
      status: 'needs_edit',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all optional)', () => {
    const result = stagingUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts nullable division_id', () => {
    const result = stagingUpdateSchema.safeParse({
      division_id: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid status value', () => {
    const result = stagingUpdateSchema.safeParse({
      status: 'archived',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// stagingBulkImportSchema
// ============================================================
describe('stagingBulkImportSchema', () => {
  it('accepts array of file paths with category', () => {
    const result = stagingBulkImportSchema.safeParse({
      files: [
        { path: '/vault/sops/hr-onboarding.md', category: 'sop' },
        { path: '/vault/strategy/q1-plan.md', category: 'strategy' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts files with optional division_id and tags', () => {
    const result = stagingBulkImportSchema.safeParse({
      files: [
        {
          path: '/vault/market/competitor-analysis.md',
          category: 'market',
          division_id: VALID_UUID,
          tags: ['market', 'q1'],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty files array', () => {
    const result = stagingBulkImportSchema.safeParse({ files: [] });
    expect(result.success).toBe(false);
  });

  it('rejects files array exceeding 100 items', () => {
    const result = stagingBulkImportSchema.safeParse({
      files: Array.from({ length: 101 }, (_, i) => ({ path: `/file-${i}.md` })),
    });
    expect(result.success).toBe(false);
  });

  it('rejects file with empty path', () => {
    const result = stagingBulkImportSchema.safeParse({
      files: [{ path: '' }],
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// subscriptionCreateSchema
// ============================================================
describe('subscriptionCreateSchema', () => {
  it('accepts valid subscription with all fields', () => {
    const result = subscriptionCreateSchema.safeParse({
      name: 'Vercel',
      category: 'platform',
      monthly_cost: 20.0,
      billing_cycle: 'monthly',
    });
    expect(result.success).toBe(true);
  });

  it('accepts full subscription with all optional fields', () => {
    const result = subscriptionCreateSchema.safeParse({
      name: 'GitHub Teams',
      category: 'dev_tools',
      vendor: 'GitHub Inc.',
      monthly_cost: 12.5,
      currency: 'CAD',
      billing_cycle: 'annual',
      renewal_date: '2026-12-31',
      division_id: VALID_UUID,
      notes: 'Covers all developers.',
    });
    expect(result.success).toBe(true);
  });

  it('uses CAD as default currency', () => {
    const result = subscriptionCreateSchema.safeParse({
      name: 'Slack',
      category: 'communications',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.currency).toBe('CAD');
    }
  });

  it('uses monthly as default billing_cycle', () => {
    const result = subscriptionCreateSchema.safeParse({
      name: 'Notion',
      category: 'operations',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.billing_cycle).toBe('monthly');
    }
  });

  it('rejects empty name', () => {
    const result = subscriptionCreateSchema.safeParse({
      name: '',
      category: 'platform',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 200 characters', () => {
    const result = subscriptionCreateSchema.safeParse({
      name: 'a'.repeat(201),
      category: 'platform',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative cost', () => {
    const result = subscriptionCreateSchema.safeParse({
      name: 'Vercel',
      category: 'platform',
      monthly_cost: -5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = subscriptionCreateSchema.safeParse({
      name: 'Mystery Tool',
      category: 'unknown',
    });
    expect(result.success).toBe(false);
  });

  it('rejects nullable division_id as invalid UUID', () => {
    const result = subscriptionCreateSchema.safeParse({
      name: 'Vercel',
      category: 'platform',
      division_id: 'bad-uuid',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// subscriptionUpdateSchema
// ============================================================
describe('subscriptionUpdateSchema', () => {
  it('accepts partial update with monthly_cost and is_active', () => {
    const result = subscriptionUpdateSchema.safeParse({
      monthly_cost: 35.0,
      is_active: false,
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all optional)', () => {
    const result = subscriptionUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts is_active toggle alone', () => {
    const result = subscriptionUpdateSchema.safeParse({ is_active: true });
    expect(result.success).toBe(true);
  });

  it('accepts nullable division_id', () => {
    const result = subscriptionUpdateSchema.safeParse({ division_id: null });
    expect(result.success).toBe(true);
  });

  it('rejects negative cost on update', () => {
    const result = subscriptionUpdateSchema.safeParse({ monthly_cost: -10 });
    expect(result.success).toBe(false);
  });
});
