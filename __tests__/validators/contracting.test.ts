import { describe, expect, it } from 'vitest';

import {
  contractAmendmentSchema,
  contractTermsCreateSchema,
  contractTermsUpdateSchema,
  esignEnvelopeCreateSchema,
  proposalCreateSchema,
  proposalEventCreateSchema,
  proposalUpdateSchema,
} from '@/lib/validators/contracting';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// proposalCreateSchema
// ============================================================
describe('proposalCreateSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = proposalCreateSchema.safeParse({
      estimate_id: VALID_UUID,
      proposal_payload: { sections: [] },
    });
    expect(result.success).toBe(true);
  });

  it('fails when estimate_id is missing', () => {
    const result = proposalCreateSchema.safeParse({
      proposal_payload: { sections: [] },
    });
    expect(result.success).toBe(false);
  });

  it('fails when estimate_id is not a valid UUID', () => {
    const result = proposalCreateSchema.safeParse({
      estimate_id: 'not-a-uuid',
      proposal_payload: { sections: [] },
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional expires_on field', () => {
    const result = proposalCreateSchema.safeParse({
      estimate_id: VALID_UUID,
      proposal_payload: { sections: [] },
      expires_on: '2026-06-30',
    });
    expect(result.success).toBe(true);
  });

  it('fails when proposal_payload is missing', () => {
    const result = proposalCreateSchema.safeParse({
      estimate_id: VALID_UUID,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// proposalUpdateSchema
// ============================================================
describe('proposalUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = proposalUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with status only', () => {
    const result = proposalUpdateSchema.safeParse({ status: 'sent' });
    expect(result.success).toBe(true);
  });

  it('accepts valid status enum values', () => {
    const statuses = [
      'draft',
      'sent',
      'viewed',
      'accepted',
      'rejected',
      'expired',
      'superseded',
    ] as const;
    for (const status of statuses) {
      const result = proposalUpdateSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('fails when status is an invalid value', () => {
    const result = proposalUpdateSchema.safeParse({ status: 'invalid_status' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// proposalEventCreateSchema
// ============================================================
describe('proposalEventCreateSchema', () => {
  it('accepts valid event with required fields only', () => {
    const result = proposalEventCreateSchema.safeParse({ event_type: 'viewed' });
    expect(result.success).toBe(true);
  });

  it('fails when event_type is missing', () => {
    const result = proposalEventCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts optional event_payload', () => {
    const result = proposalEventCreateSchema.safeParse({
      event_type: 'signed',
      event_payload: { ip: '192.168.1.1', user_agent: 'Mozilla/5.0' },
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// contractTermsCreateSchema
// ============================================================
describe('contractTermsCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = contractTermsCreateSchema.safeParse({
      proposal_id: VALID_UUID,
      legal_text_version: 'v1.0',
      terms_payload: { clauses: [] },
    });
    expect(result.success).toBe(true);
  });

  it('fails when proposal_id is missing', () => {
    const result = contractTermsCreateSchema.safeParse({
      legal_text_version: 'v1.0',
      terms_payload: { clauses: [] },
    });
    expect(result.success).toBe(false);
  });

  it('fails when legal_text_version is missing', () => {
    const result = contractTermsCreateSchema.safeParse({
      proposal_id: VALID_UUID,
      terms_payload: { clauses: [] },
    });
    expect(result.success).toBe(false);
  });

  it('fails when terms_payload is missing', () => {
    const result = contractTermsCreateSchema.safeParse({
      proposal_id: VALID_UUID,
      legal_text_version: 'v1.0',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid UUID for proposal_id', () => {
    const result = contractTermsCreateSchema.safeParse({
      proposal_id: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      legal_text_version: 'v2.1',
      terms_payload: { holdback: '10%' },
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// contractTermsUpdateSchema
// ============================================================
describe('contractTermsUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = contractTermsUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with legal_text_version only', () => {
    const result = contractTermsUpdateSchema.safeParse({ legal_text_version: 'v1.1' });
    expect(result.success).toBe(true);
  });

  it('accepts valid contract_status enum values', () => {
    const statuses = ['draft', 'pending_signature', 'signed', 'amended', 'terminated'] as const;
    for (const contract_status of statuses) {
      const result = contractTermsUpdateSchema.safeParse({ contract_status });
      expect(result.success).toBe(true);
    }
  });
});

// ============================================================
// contractAmendmentSchema
// ============================================================
describe('contractAmendmentSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = contractAmendmentSchema.safeParse({
      legal_text_version: 'v1.1',
      terms_payload: { change_order: 'CO-001' },
      amendment_reason: 'Scope change approved by client',
    });
    expect(result.success).toBe(true);
  });

  it('fails when legal_text_version is missing', () => {
    const result = contractAmendmentSchema.safeParse({
      terms_payload: { change_order: 'CO-001' },
      amendment_reason: 'Scope change',
    });
    expect(result.success).toBe(false);
  });

  it('fails when terms_payload is missing', () => {
    const result = contractAmendmentSchema.safeParse({
      legal_text_version: 'v1.1',
      amendment_reason: 'Scope change',
    });
    expect(result.success).toBe(false);
  });

  it('fails when amendment_reason is missing', () => {
    const result = contractAmendmentSchema.safeParse({
      legal_text_version: 'v1.1',
      terms_payload: { change_order: 'CO-001' },
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// esignEnvelopeCreateSchema
// ============================================================
describe('esignEnvelopeCreateSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = esignEnvelopeCreateSchema.safeParse({
      contract_id: VALID_UUID,
      signer_count: 2,
    });
    expect(result.success).toBe(true);
  });

  it('fails when contract_id is missing', () => {
    const result = esignEnvelopeCreateSchema.safeParse({ signer_count: 2 });
    expect(result.success).toBe(false);
  });

  it('fails when signer_count is less than 1', () => {
    const result = esignEnvelopeCreateSchema.safeParse({
      contract_id: VALID_UUID,
      signer_count: 0,
    });
    expect(result.success).toBe(false);
  });

  it('defaults provider to boldsign when not provided', () => {
    const result = esignEnvelopeCreateSchema.safeParse({
      contract_id: VALID_UUID,
      signer_count: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('boldsign');
    }
  });
});
