import { z } from 'zod';

// ============================================================
// RFQ package schemas
// ============================================================

export const rfqPackageCreateSchema = z.object({
  rfq_number: z.string().min(1),
  title: z.string().min(1).max(200),
  scope_summary: z.string().optional(),
  due_at: z.string().optional(),
});

export const rfqPackageUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  scope_summary: z.string().optional().nullable(),
  due_at: z.string().optional().nullable(),
  status: z.enum(['draft', 'issued', 'closed', 'awarded', 'cancelled']).optional(),
});

// ============================================================
// RFQ invite schemas
// ============================================================

export const rfqInviteSchema = z.object({
  portal_account_id: z.string().uuid().optional(),
  invited_email: z.string().email().optional(),
});

// ============================================================
// RFQ bid schemas
// ============================================================

export const rfqBidCreateSchema = z.object({
  invite_id: z.string().uuid().optional(),
  submitted_by_portal_id: z.string().uuid().optional(),
  currency_code: z.string().length(3).optional(),
  subtotal_amount: z.number().min(0),
  tax_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0),
  exclusions: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Bid leveling schemas
// ============================================================

export const bidLevelingSessionSchema = z.object({
  notes: z.string().optional(),
});

export const bidLevelingEntrySchema = z.object({
  bid_id: z.string().uuid(),
  normalized_total: z.number().min(0),
  risk_score: z.number().min(0).max(100).optional(),
  recommended: z.boolean().optional(),
  rationale: z.string().optional(),
});

// ============================================================
// Compliance doc schemas
// ============================================================

export const complianceDocCreateSchema = z.object({
  portal_account_id: z.string().uuid(),
  compliance_type: z.string().min(1),
  file_id: z.string().uuid().optional(),
  doc_number: z.string().optional(),
  issued_on: z.string().optional(),
  expires_on: z.string().optional(),
});

export const complianceDocUpdateSchema = z.object({
  status: z.enum(['valid', 'expiring', 'expired', 'rejected']).optional(),
  doc_number: z.string().optional(),
  expires_on: z.string().optional().nullable(),
});

// ============================================================
// Cost code schemas
// ============================================================

export const costCodeCreateSchema = z.object({
  division_id: z.string().uuid(),
  cost_code: z.string().min(1),
  cost_code_name: z.string().min(1),
  parent_cost_code_id: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const costCodeUpdateSchema = z.object({
  cost_code_name: z.string().min(1).optional(),
  is_active: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const costCodeMappingSchema = z.object({
  division_id: z.string().uuid(),
  local_cost_code: z.string().min(1),
  erp_cost_code: z.string().min(1),
  adp_labor_code: z.string().optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type RFQPackageCreate = z.infer<typeof rfqPackageCreateSchema>;
export type RFQPackageUpdate = z.infer<typeof rfqPackageUpdateSchema>;
export type RFQInvite = z.infer<typeof rfqInviteSchema>;
export type RFQBidCreate = z.infer<typeof rfqBidCreateSchema>;
export type BidLevelingSession = z.infer<typeof bidLevelingSessionSchema>;
export type BidLevelingEntry = z.infer<typeof bidLevelingEntrySchema>;
export type ComplianceDocCreate = z.infer<typeof complianceDocCreateSchema>;
export type ComplianceDocUpdate = z.infer<typeof complianceDocUpdateSchema>;
export type CostCodeCreate = z.infer<typeof costCodeCreateSchema>;
export type CostCodeUpdate = z.infer<typeof costCodeUpdateSchema>;
export type CostCodeMapping = z.infer<typeof costCodeMappingSchema>;
