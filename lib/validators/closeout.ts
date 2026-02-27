import { z } from 'zod';

// ============================================================
// Closeout package schemas
// ============================================================

export const closeoutPackageCreateSchema = z.object({
  checklist_payload: z.record(z.string(), z.unknown()).optional(),
});

export const closeoutPackageUpdateSchema = z.object({
  status: z.enum(['draft', 'in_review', 'client_review', 'accepted', 'rejected']).optional(),
  checklist_payload: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Deficiency item schemas
// ============================================================

export const deficiencyItemCreateSchema = z.object({
  title: z.string().min(1).max(200),
  details: z.string().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigned_to: z.string().uuid().optional(),
  due_at: z.string().optional(),
});

export const deficiencyItemUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  details: z.string().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'resolved', 'verified', 'closed']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  due_at: z.string().optional().nullable(),
  closed_at: z.string().optional().nullable(),
});

// ============================================================
// Warranty item schemas
// ============================================================

export const warrantyItemCreateSchema = z.object({
  title: z.string().min(1).max(200),
  deficiency_id: z.string().uuid().optional(),
  provider_name: z.string().optional(),
  warranty_start: z.string().min(1),
  warranty_end: z.string().min(1),
  terms: z.string().optional(),
});

// ============================================================
// Service call schemas
// ============================================================

export const serviceCallCreateSchema = z.object({
  call_number: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  warranty_item_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
});

export const serviceCallUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['open', 'scheduled', 'in_progress', 'resolved', 'closed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  resolved_at: z.string().optional().nullable(),
  closed_at: z.string().optional().nullable(),
});

export const serviceEventCreateSchema = z.object({
  event_type: z.string().min(1),
  event_payload: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type CloseoutPackageCreate = z.infer<typeof closeoutPackageCreateSchema>;
export type CloseoutPackageUpdate = z.infer<typeof closeoutPackageUpdateSchema>;
export type DeficiencyItemCreate = z.infer<typeof deficiencyItemCreateSchema>;
export type DeficiencyItemUpdate = z.infer<typeof deficiencyItemUpdateSchema>;
export type WarrantyItemCreate = z.infer<typeof warrantyItemCreateSchema>;
export type ServiceCallCreate = z.infer<typeof serviceCallCreateSchema>;
export type ServiceCallUpdate = z.infer<typeof serviceCallUpdateSchema>;
export type ServiceEventCreate = z.infer<typeof serviceEventCreateSchema>;
