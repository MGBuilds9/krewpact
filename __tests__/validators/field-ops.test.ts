import { describe, expect, it } from 'vitest';

import {
  changeOrderCreateSchema,
  changeOrderUpdateSchema,
  changeRequestCreateSchema,
  changeRequestUpdateSchema,
  rfiCreateSchema,
  rfiThreadCreateSchema,
  rfiUpdateSchema,
  submittalCreateSchema,
  submittalReviewSchema,
  submittalUpdateSchema,
} from '@/lib/validators/field-ops';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// rfiCreateSchema
// ============================================================
describe('rfiCreateSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = rfiCreateSchema.safeParse({
      rfi_number: 'RFI-001',
      title: 'Clarify foundation depth',
      question_text: 'What is the required depth for the foundation footings?',
    });
    expect(result.success).toBe(true);
  });

  it('fails when rfi_number is missing', () => {
    const result = rfiCreateSchema.safeParse({
      title: 'Clarify foundation depth',
      question_text: 'What is the required depth?',
    });
    expect(result.success).toBe(false);
  });

  it('fails when title is missing', () => {
    const result = rfiCreateSchema.safeParse({
      rfi_number: 'RFI-001',
      question_text: 'What is the required depth?',
    });
    expect(result.success).toBe(false);
  });

  it('fails when title exceeds 200 characters', () => {
    const result = rfiCreateSchema.safeParse({
      rfi_number: 'RFI-001',
      title: 'A'.repeat(201),
      question_text: 'Some question',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional responder_user_id as valid UUID', () => {
    const result = rfiCreateSchema.safeParse({
      rfi_number: 'RFI-001',
      title: 'Clarify depth',
      question_text: 'Some question',
      responder_user_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// rfiUpdateSchema
// ============================================================
describe('rfiUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = rfiUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    for (const status of ['open', 'responded', 'closed', 'void'] as const) {
      expect(rfiUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = rfiUpdateSchema.safeParse({ status: 'pending' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable responder_user_id', () => {
    const result = rfiUpdateSchema.safeParse({ responder_user_id: null });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// rfiThreadCreateSchema
// ============================================================
describe('rfiThreadCreateSchema', () => {
  it('accepts valid input with required field only', () => {
    const result = rfiThreadCreateSchema.safeParse({ message_text: 'Depth is 1.2m per spec.' });
    expect(result.success).toBe(true);
  });

  it('fails when message_text is missing', () => {
    const result = rfiThreadCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts optional is_official_response boolean', () => {
    const result = rfiThreadCreateSchema.safeParse({
      message_text: 'Official reply.',
      is_official_response: true,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// submittalCreateSchema
// ============================================================
describe('submittalCreateSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = submittalCreateSchema.safeParse({
      submittal_number: 'SUB-001',
      title: 'Structural steel shop drawings',
    });
    expect(result.success).toBe(true);
  });

  it('fails when submittal_number is missing', () => {
    const result = submittalCreateSchema.safeParse({ title: 'Shop drawings' });
    expect(result.success).toBe(false);
  });

  it('fails when title is missing', () => {
    const result = submittalCreateSchema.safeParse({ submittal_number: 'SUB-001' });
    expect(result.success).toBe(false);
  });

  it('accepts optional due_at field', () => {
    const result = submittalCreateSchema.safeParse({
      submittal_number: 'SUB-001',
      title: 'Shop drawings',
      due_at: '2026-03-15T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// submittalUpdateSchema
// ============================================================
describe('submittalUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = submittalUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = [
      'draft',
      'submitted',
      'revise_and_resubmit',
      'approved',
      'approved_as_noted',
      'rejected',
    ] as const;
    for (const status of statuses) {
      expect(submittalUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = submittalUpdateSchema.safeParse({ status: 'pending_review' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// submittalReviewSchema
// ============================================================
describe('submittalReviewSchema', () => {
  it('accepts valid outcome', () => {
    const result = submittalReviewSchema.safeParse({ outcome: 'approved' });
    expect(result.success).toBe(true);
  });

  it('fails when outcome is missing', () => {
    const result = submittalReviewSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when outcome is invalid enum value', () => {
    const result = submittalReviewSchema.safeParse({ outcome: 'pending' });
    expect(result.success).toBe(false);
  });

  it('accepts optional review_notes', () => {
    const result = submittalReviewSchema.safeParse({
      outcome: 'approved_as_noted',
      review_notes: 'Minor corrections required on sheet A2.',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// changeRequestCreateSchema
// ============================================================
describe('changeRequestCreateSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = changeRequestCreateSchema.safeParse({
      request_number: 'PCO-001',
      title: 'Additional excavation',
      description: 'Unexpected rock encountered at 2m depth.',
    });
    expect(result.success).toBe(true);
  });

  it('fails when request_number is missing', () => {
    const result = changeRequestCreateSchema.safeParse({
      title: 'Additional excavation',
      description: 'Rock encountered.',
    });
    expect(result.success).toBe(false);
  });

  it('fails when description is missing', () => {
    const result = changeRequestCreateSchema.safeParse({
      request_number: 'PCO-001',
      title: 'Additional excavation',
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional cost and days impact', () => {
    const result = changeRequestCreateSchema.safeParse({
      request_number: 'PCO-001',
      title: 'Additional excavation',
      description: 'Rock encountered.',
      estimated_cost_impact: 15000.0,
      estimated_days_impact: 5,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// changeRequestUpdateSchema
// ============================================================
describe('changeRequestUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = changeRequestUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid state enum values', () => {
    const states = ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'void'] as const;
    for (const state of states) {
      expect(changeRequestUpdateSchema.safeParse({ state }).success).toBe(true);
    }
  });

  it('fails when state is invalid', () => {
    const result = changeRequestUpdateSchema.safeParse({ state: 'pending' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// changeOrderCreateSchema
// ============================================================
describe('changeOrderCreateSchema', () => {
  it('accepts valid input with required field only', () => {
    const result = changeOrderCreateSchema.safeParse({ co_number: 'CO-001' });
    expect(result.success).toBe(true);
  });

  it('fails when co_number is missing', () => {
    const result = changeOrderCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts optional change_request_id as valid UUID', () => {
    const result = changeOrderCreateSchema.safeParse({
      co_number: 'CO-001',
      change_request_id: VALID_UUID,
    });
    expect(result.success).toBe(true);
  });

  it('fails when change_request_id is not a valid UUID', () => {
    const result = changeOrderCreateSchema.safeParse({
      co_number: 'CO-001',
      change_request_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// changeOrderUpdateSchema
// ============================================================
describe('changeOrderUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = changeOrderUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = [
      'draft',
      'submitted',
      'client_review',
      'approved',
      'rejected',
      'void',
    ] as const;
    for (const status of statuses) {
      expect(changeOrderUpdateSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it('fails when status is invalid', () => {
    const result = changeOrderUpdateSchema.safeParse({ status: 'signed' });
    expect(result.success).toBe(false);
  });

  it('accepts nullable approved_by', () => {
    const result = changeOrderUpdateSchema.safeParse({ approved_by: null });
    expect(result.success).toBe(true);
  });
});
