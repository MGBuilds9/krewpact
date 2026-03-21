import { z } from 'zod';

// Upload / create job
export const createTakeoffJobSchema = z.object({
  // No body fields needed — files come via FormData, estimate_id from URL param
});

// Cancel job
export const cancelTakeoffJobSchema = z.object({
  action: z.literal('cancel'),
});

// Bulk review status update
export const reviewDraftLinesSchema = z.object({
  line_ids: z.array(z.string().uuid()).min(1),
  status: z.enum(['accepted', 'rejected']),
});

// Accept lines into estimate
export const acceptTakeoffLinesSchema = z.object({
  lines: z
    .array(
      z.object({
        draft_line_id: z.string().uuid(),
        description: z.string().min(1).max(500),
        quantity: z.number().gt(0),
        unit: z.string().min(1).max(20),
        unit_cost: z.number().min(0),
        markup_pct: z.number().min(0).max(100).default(0),
      }),
    )
    .min(1),
});

// Feedback (for manual submission if needed)
export const submitFeedbackSchema = z.object({
  items: z
    .array(
      z.object({
        draft_line_id: z.string().uuid().optional(),
        feedback_type: z.enum(['accepted', 'corrected', 'rejected', 'missed']),
        original_value: z.record(z.string(), z.unknown()).optional(),
        corrected_value: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .min(1),
});

// Inferred types
export type CreateTakeoffJob = z.infer<typeof createTakeoffJobSchema>;
export type ReviewDraftLines = z.infer<typeof reviewDraftLinesSchema>;
export type AcceptTakeoffLines = z.infer<typeof acceptTakeoffLinesSchema>;
export type SubmitFeedback = z.infer<typeof submitFeedbackSchema>;
