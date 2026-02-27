import { z } from 'zod';

// ============================================================
// Proposal schemas
// ============================================================

const proposalStatuses = ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'superseded'] as const;

export const proposalCreateSchema = z.object({
  estimate_id: z.string().uuid(),
  proposal_payload: z.record(z.string(), z.unknown()),
  expires_on: z.string().optional(),
});

export const proposalUpdateSchema = z.object({
  status: z.enum(proposalStatuses).optional(),
  proposal_payload: z.record(z.string(), z.unknown()).optional(),
  expires_on: z.string().optional().nullable(),
});

export const proposalEventCreateSchema = z.object({
  event_type: z.string().min(1),
  event_payload: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Contract terms schemas
// ============================================================

const contractStatuses = ['draft', 'pending_signature', 'signed', 'amended', 'terminated'] as const;

export const contractTermsCreateSchema = z.object({
  proposal_id: z.string().uuid(),
  legal_text_version: z.string().min(1),
  terms_payload: z.record(z.string(), z.unknown()),
});

export const contractTermsUpdateSchema = z.object({
  contract_status: z.enum(contractStatuses).optional(),
  legal_text_version: z.string().min(1).optional(),
  terms_payload: z.record(z.string(), z.unknown()).optional(),
});

export const contractAmendmentSchema = z.object({
  legal_text_version: z.string().min(1),
  terms_payload: z.record(z.string(), z.unknown()),
  amendment_reason: z.string().min(1),
});

// ============================================================
// E-sign schemas
// ============================================================

export const esignEnvelopeCreateSchema = z.object({
  contract_id: z.string().uuid(),
  provider: z.string().default('boldsign'),
  signer_count: z.number().int().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const esignEnvelopeUpdateSchema = z.object({
  status: z.string().optional(),
  provider_envelope_id: z.string().optional(),
  webhook_last_event_at: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type ProposalCreate = z.infer<typeof proposalCreateSchema>;
export type ProposalUpdate = z.infer<typeof proposalUpdateSchema>;
export type ProposalEventCreate = z.infer<typeof proposalEventCreateSchema>;
export type ContractTermsCreate = z.infer<typeof contractTermsCreateSchema>;
export type ContractTermsUpdate = z.infer<typeof contractTermsUpdateSchema>;
export type ContractAmendment = z.infer<typeof contractAmendmentSchema>;
export type ESignEnvelopeCreate = z.infer<typeof esignEnvelopeCreateSchema>;
export type ESignEnvelopeUpdate = z.infer<typeof esignEnvelopeUpdateSchema>;
