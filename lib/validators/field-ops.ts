import { z } from 'zod';

// ============================================================
// RFI schemas
// ============================================================

const rfiStatuses = ['open', 'responded', 'closed', 'void'] as const;

export const rfiCreateSchema = z.object({
  rfi_number: z.string().min(1),
  title: z.string().min(1).max(200),
  question_text: z.string().min(1),
  due_at: z.string().optional(),
  responder_user_id: z.string().uuid().optional(),
});

export const rfiUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  question_text: z.string().min(1).optional(),
  status: z.enum(rfiStatuses).optional(),
  due_at: z.string().optional().nullable(),
  responder_user_id: z.string().uuid().optional().nullable(),
  closed_at: z.string().optional().nullable(),
});

export const rfiThreadCreateSchema = z.object({
  message_text: z.string().min(1),
  is_official_response: z.boolean().optional(),
});

// ============================================================
// Submittal schemas
// ============================================================

const submittalStatuses = [
  'draft',
  'submitted',
  'revise_and_resubmit',
  'approved',
  'approved_as_noted',
  'rejected',
] as const;

export const submittalCreateSchema = z.object({
  submittal_number: z.string().min(1),
  title: z.string().min(1).max(200),
  due_at: z.string().optional(),
});

export const submittalUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: z.enum(submittalStatuses).optional(),
  due_at: z.string().optional().nullable(),
  submitted_at: z.string().optional().nullable(),
});

export const submittalReviewSchema = z.object({
  outcome: z.enum(submittalStatuses),
  review_notes: z.string().optional(),
});

// ============================================================
// Change Request schemas
// ============================================================

const workflowStates = ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'void'] as const;

export const changeRequestCreateSchema = z.object({
  request_number: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  estimated_cost_impact: z.number().optional(),
  estimated_days_impact: z.number().int().optional(),
});

export const changeRequestUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  state: z.enum(workflowStates).optional(),
  estimated_cost_impact: z.number().optional(),
  estimated_days_impact: z.number().int().optional(),
});

// ============================================================
// Change Order schemas
// ============================================================

const coStatuses = ['draft', 'submitted', 'client_review', 'approved', 'rejected', 'void'] as const;

export const changeOrderCreateSchema = z.object({
  co_number: z.string().min(1),
  change_request_id: z.string().uuid().optional(),
  reason: z.string().optional(),
  amount_delta: z.number().optional(),
  days_delta: z.number().int().optional(),
});

export const changeOrderUpdateSchema = z.object({
  status: z.enum(coStatuses).optional(),
  reason: z.string().optional(),
  amount_delta: z.number().optional(),
  days_delta: z.number().int().optional(),
  approved_at: z.string().optional().nullable(),
  approved_by: z.string().uuid().optional().nullable(),
});

// ============================================================
// Inferred types
// ============================================================

export type RFICreate = z.infer<typeof rfiCreateSchema>;
export type RFIUpdate = z.infer<typeof rfiUpdateSchema>;
export type RFIThreadCreate = z.infer<typeof rfiThreadCreateSchema>;
export type SubmittalCreate = z.infer<typeof submittalCreateSchema>;
export type SubmittalUpdate = z.infer<typeof submittalUpdateSchema>;
export type SubmittalReview = z.infer<typeof submittalReviewSchema>;
export type ChangeRequestCreate = z.infer<typeof changeRequestCreateSchema>;
export type ChangeRequestUpdate = z.infer<typeof changeRequestUpdateSchema>;
export type ChangeOrderCreate = z.infer<typeof changeOrderCreateSchema>;
export type ChangeOrderUpdate = z.infer<typeof changeOrderUpdateSchema>;
