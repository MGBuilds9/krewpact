import { z } from 'zod';

// ============================================================
// File folder schemas
// ============================================================

const visibilityValues = ['internal', 'client', 'trade', 'public'] as const;

export const folderCreateSchema = z.object({
  folder_name: z.string().min(1).max(200),
  parent_folder_id: z.string().uuid().optional(),
  visibility: z.enum(visibilityValues).optional(),
});

export const folderUpdateSchema = z.object({
  folder_name: z.string().min(1).max(200).optional(),
  visibility: z.enum(visibilityValues).optional(),
});

// ============================================================
// File metadata schemas
// ============================================================

export const fileMetadataCreateSchema = z.object({
  storage_bucket: z.string().min(1),
  file_path: z.string().min(1),
  filename: z.string().min(1),
  original_filename: z.string().min(1),
  mime_type: z.string().optional(),
  file_size_bytes: z.number().int().min(0),
  visibility: z.enum(visibilityValues).optional(),
  tags: z.array(z.string()).optional(),
  folder_id: z.string().uuid().optional(),
});

export const fileMetadataUpdateSchema = z.object({
  filename: z.string().min(1).optional(),
  visibility: z.enum(visibilityValues).optional(),
  tags: z.array(z.string()).optional(),
  is_deleted: z.boolean().optional(),
});

// ============================================================
// File version schemas
// ============================================================

export const fileVersionSchema = z.object({
  storage_bucket: z.string().min(1),
  file_path: z.string().min(1),
  checksum_sha256: z.string().optional(),
  change_note: z.string().optional(),
});

// ============================================================
// File share schemas
// ============================================================

export const fileShareCreateSchema = z.object({
  shared_with_user_id: z.string().uuid().optional(),
  shared_with_portal_actor_id: z.string().uuid().optional(),
  permission_level: z.string().min(1).optional(),
  expires_at: z.string().optional(),
});

// ============================================================
// Photo schemas
// ============================================================

export const photoAssetCreateSchema = z.object({
  file_id: z.string().uuid(),
  taken_at: z.string().optional(),
  location_point: z.record(z.string(), z.unknown()).optional(),
  category: z.string().optional(),
});

export const photoAnnotationSchema = z.object({
  annotation_json: z.record(z.string(), z.unknown()),
});

// ============================================================
// Inferred types
// ============================================================

export type FolderCreate = z.infer<typeof folderCreateSchema>;
export type FolderUpdate = z.infer<typeof folderUpdateSchema>;
export type FileMetadataCreate = z.infer<typeof fileMetadataCreateSchema>;
export type FileMetadataUpdate = z.infer<typeof fileMetadataUpdateSchema>;
export type FileVersion = z.infer<typeof fileVersionSchema>;
export type FileShareCreate = z.infer<typeof fileShareCreateSchema>;
export type PhotoAssetCreate = z.infer<typeof photoAssetCreateSchema>;
export type PhotoAnnotation = z.infer<typeof photoAnnotationSchema>;
