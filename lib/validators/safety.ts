import { z } from 'zod';

// ============================================================
// Safety form schemas
// ============================================================

const workflowStates = ['draft', 'submitted', 'in_review', 'approved', 'rejected', 'void'] as const;

export const safetyFormCreateSchema = z.object({
  form_type: z.string().min(1),
  form_date: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const safetyFormUpdateSchema = z.object({
  state: z.enum(workflowStates).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  submitted_at: z.string().optional().nullable(),
});

// ============================================================
// Safety incident schemas
// ============================================================

const severityLevels = ['low', 'medium', 'high', 'critical'] as const;

export const safetyIncidentCreateSchema = z.object({
  incident_date: z.string().min(1),
  severity: z.enum(severityLevels),
  summary: z.string().min(1).max(500),
  details: z.record(z.string(), z.unknown()),
});

export const safetyIncidentUpdateSchema = z.object({
  severity: z.enum(severityLevels).optional(),
  summary: z.string().min(1).max(500).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
  corrective_actions: z.record(z.string(), z.unknown()).optional().nullable(),
  closed_at: z.string().optional().nullable(),
});

// ============================================================
// Toolbox talk schemas
// ============================================================

export const toolboxTalkCreateSchema = z.object({
  talk_date: z.string().min(1),
  topic: z.string().min(1).max(200),
  attendee_count: z.number().int().min(0),
  notes: z.string().optional(),
});

export const toolboxTalkUpdateSchema = z.object({
  topic: z.string().min(1).max(200).optional(),
  attendee_count: z.number().int().min(0).optional(),
  notes: z.string().optional().nullable(),
});

// ============================================================
// Inspection schemas
// ============================================================

export const inspectionCreateSchema = z.object({
  inspection_type: z.string().min(1),
  inspection_date: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const inspectionUpdateSchema = z.object({
  state: z.enum(workflowStates).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Inferred types
// ============================================================

export type SafetyFormCreate = z.infer<typeof safetyFormCreateSchema>;
export type SafetyFormUpdate = z.infer<typeof safetyFormUpdateSchema>;
export type SafetyIncidentCreate = z.infer<typeof safetyIncidentCreateSchema>;
export type SafetyIncidentUpdate = z.infer<typeof safetyIncidentUpdateSchema>;
export type ToolboxTalkCreate = z.infer<typeof toolboxTalkCreateSchema>;
export type ToolboxTalkUpdate = z.infer<typeof toolboxTalkUpdateSchema>;
export type InspectionCreate = z.infer<typeof inspectionCreateSchema>;
export type InspectionUpdate = z.infer<typeof inspectionUpdateSchema>;
