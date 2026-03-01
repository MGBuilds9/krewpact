import { z } from 'zod';

// ============================================================
// Migration batch schemas
// ============================================================

export const migrationBatchCreateSchema = z.object({
  source_system: z.string().min(1),
  batch_name: z.string().min(1),
});

export const migrationBatchUpdateSchema = z.object({
  status: z.enum(['queued', 'running', 'completed', 'failed', 'dead_letter']).optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Migration conflict resolution schemas
// ============================================================

export const migrationConflictResolutionSchema = z.object({
  resolution_status: z.enum(['open', 'resolved', 'skipped']),
  resolution_notes: z.string().optional(),
});

// ============================================================
// Privacy request schemas
// ============================================================

export const privacyRequestCreateSchema = z.object({
  requester_email: z.string().email(),
  requester_name: z.string().optional(),
  request_type: z.enum(['access', 'correction', 'deletion', 'export']),
  legal_basis: z.string().optional(),
  notes: z.string().optional(),
});

export const privacyRequestUpdateSchema = z.object({
  status: z.enum(['received', 'verified', 'in_progress', 'completed', 'rejected']).optional(),
  notes: z.string().optional(),
});

export const privacyEventSchema = z.object({
  event_type: z.string().min(1),
  event_payload: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// BCP schemas
// ============================================================

export const bcpIncidentCreateSchema = z.object({
  incident_number: z.string().min(1),
  severity: z.enum(['sev1', 'sev2', 'sev3', 'sev4']),
  title: z.string().min(1),
  summary: z.string().optional(),
});

export const bcpIncidentUpdateSchema = z.object({
  status: z.enum(['open', 'mitigating', 'monitoring', 'resolved', 'closed']).optional(),
  summary: z.string().optional(),
  resolved_at: z.string().optional().nullable(),
});

export const bcpRecoveryEventSchema = z.object({
  event_type: z.string().min(1),
  event_payload: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type MigrationBatchCreate = z.infer<typeof migrationBatchCreateSchema>;
export type MigrationBatchUpdate = z.infer<typeof migrationBatchUpdateSchema>;
export type MigrationConflictResolution = z.infer<typeof migrationConflictResolutionSchema>;
export type PrivacyRequestCreate = z.infer<typeof privacyRequestCreateSchema>;
export type PrivacyRequestUpdate = z.infer<typeof privacyRequestUpdateSchema>;
export type PrivacyEvent = z.infer<typeof privacyEventSchema>;
export type BCPIncidentCreate = z.infer<typeof bcpIncidentCreateSchema>;
export type BCPIncidentUpdate = z.infer<typeof bcpIncidentUpdateSchema>;
export type BCPRecoveryEvent = z.infer<typeof bcpRecoveryEventSchema>;
