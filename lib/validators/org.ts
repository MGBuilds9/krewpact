import { z } from 'zod';

// ============================================================
// Profile schemas
// ============================================================

export const profileUpdateSchema = z.object({
  full_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});

// ============================================================
// Division schemas
// ============================================================

export const divisionSetupCreateSchema = z.object({
  division_name: z.string().min(1).max(100),
  division_code: z.string().min(1).max(20),
  description: z.string().optional(),
});

export const divisionUpdateSchema = z.object({
  division_name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
});

// ============================================================
// User provisioning schemas
// ============================================================

export const userProvisioningSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role_ids: z.array(z.string().uuid()).min(1),
  division_ids: z.array(z.string().uuid()).min(1),
});

// ============================================================
// Role + permission schemas
// ============================================================

export const rolePermissionEditorSchema = z.object({
  role_id: z.string().uuid(),
  permission_id: z.string().uuid(),
  granted: z.boolean(),
});

export const policyOverrideCreateSchema = z.object({
  user_id: z.string().uuid(),
  permission_id: z.string().uuid(),
  override_value: z.boolean(),
  reason: z.string().min(1),
  expires_at: z.string().optional(),
});

// ============================================================
// Notification preference schemas
// ============================================================

export const notificationPreferenceUpdateSchema = z.object({
  in_app_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  quiet_hours: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ============================================================
// Inferred types
// ============================================================

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type DivisionSetupCreate = z.infer<typeof divisionSetupCreateSchema>;
export type DivisionUpdate = z.infer<typeof divisionUpdateSchema>;
export type UserProvisioning = z.infer<typeof userProvisioningSchema>;
export type RolePermissionEditor = z.infer<typeof rolePermissionEditorSchema>;
export type PolicyOverrideCreate = z.infer<typeof policyOverrideCreateSchema>;
export type NotificationPreferenceUpdate = z.infer<typeof notificationPreferenceUpdateSchema>;
