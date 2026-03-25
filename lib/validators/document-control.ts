import { z } from 'zod';

// ============================================================
// Attachment schemas
// ============================================================

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
] as const;

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export const attachmentUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(128),
  sizeBytes: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
});

export const attachmentSchema = z.object({
  id: z.string().uuid(),
  entity_type: z.enum(['rfi', 'submittal']),
  entity_id: z.string().uuid(),
  file_name: z.string().min(1).max(255),
  storage_path: z.string().min(1),
  mime_type: z.string().min(1).max(128),
  size_bytes: z.number().int().positive(),
  uploaded_by: z.string(),
  deleted_at: z.string().nullable(),
  created_at: z.string(),
});

// ============================================================
// Distribution log schemas
// ============================================================

const distributionStatuses = ['sent', 'delivered', 'acknowledged'] as const;

export const distributionLogCreateSchema = z.object({
  recipients: z
    .array(
      z.object({
        user_id: z.string().uuid(),
        email: z.string().email(),
        name: z.string().min(1).max(200),
      }),
    )
    .min(1)
    .max(50),
});

export const distributionLogSchema = z.object({
  id: z.string().uuid(),
  submittal_id: z.string().uuid(),
  recipient_user_id: z.string().uuid().nullable(),
  recipient_email: z.string().email(),
  recipient_name: z.string(),
  status: z.enum(distributionStatuses),
  sent_at: z.string(),
  acknowledged_at: z.string().nullable(),
  created_at: z.string(),
});

// ============================================================
// Inferred types
// ============================================================

export type AttachmentUpload = z.infer<typeof attachmentUploadSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type DistributionLogCreate = z.infer<typeof distributionLogCreateSchema>;
export type DistributionLog = z.infer<typeof distributionLogSchema>;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES };
