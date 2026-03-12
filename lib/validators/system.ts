import { z } from 'zod';

// ============================================================
// Webhook replay schemas
// ============================================================

export const webhookReplaySchema = z.object({
  webhook_event_id: z.string().uuid(),
});

// ============================================================
// ERP sync control schemas
// ============================================================

export const erpSyncControlSchema = z.object({
  entity_type: z.string().min(1),
  entity_id: z.string().uuid().optional(),
  action: z.enum(['pause', 'resume', 'retry', 'cancel']),
});

// ============================================================
// Notification replay schemas
// ============================================================

export const notificationReplaySchema = z.object({
  notification_id: z.string().uuid(),
});

// ============================================================
// Audit log query schemas
// ============================================================

export const auditLogQuerySchema = z.object({
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  actor_user_id: z.string().uuid().optional(),
  action: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

// ============================================================
// Feature flag filter schemas
// ============================================================

export const featureFlagFilterSchema = z.object({
  feature_name: z.string().optional(),
  division_id: z.string().uuid().optional(),
  is_enabled: z.boolean().optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type WebhookReplay = z.infer<typeof webhookReplaySchema>;
export type ERPSyncControl = z.infer<typeof erpSyncControlSchema>;
export type NotificationReplay = z.infer<typeof notificationReplaySchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
export type FeatureFlagFilter = z.infer<typeof featureFlagFilterSchema>;
