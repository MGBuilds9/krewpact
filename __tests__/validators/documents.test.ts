import { describe, it, expect } from 'vitest';
import {
  folderCreateSchema,
  folderUpdateSchema,
  fileMetadataCreateSchema,
  fileMetadataUpdateSchema,
  fileVersionSchema,
  fileShareCreateSchema,
  photoAssetCreateSchema,
  photoAnnotationSchema,
} from '@/lib/validators/documents';

const VALID_UUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

// ============================================================
// folderCreateSchema
// ============================================================
describe('folderCreateSchema', () => {
  it('accepts valid input with required field only', () => {
    const result = folderCreateSchema.safeParse({ folder_name: 'Site Photos' });
    expect(result.success).toBe(true);
  });

  it('fails when folder_name is missing', () => {
    const result = folderCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when folder_name exceeds 200 characters', () => {
    const result = folderCreateSchema.safeParse({ folder_name: 'A'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('accepts valid visibility enum values', () => {
    for (const visibility of ['internal', 'client', 'trade', 'public'] as const) {
      expect(folderCreateSchema.safeParse({ folder_name: 'Docs', visibility }).success).toBe(true);
    }
  });

  it('fails when visibility is invalid', () => {
    const result = folderCreateSchema.safeParse({ folder_name: 'Docs', visibility: 'private' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// folderUpdateSchema
// ============================================================
describe('folderUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = folderUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial update with folder_name only', () => {
    const result = folderUpdateSchema.safeParse({ folder_name: 'Updated Folder' });
    expect(result.success).toBe(true);
  });

  it('fails when visibility is invalid', () => {
    const result = folderUpdateSchema.safeParse({ visibility: 'restricted' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// fileMetadataCreateSchema
// ============================================================
describe('fileMetadataCreateSchema', () => {
  it('accepts valid input with all required fields', () => {
    const result = fileMetadataCreateSchema.safeParse({
      storage_bucket: 'project-docs',
      file_path: 'projects/123/drawings.pdf',
      filename: 'drawings.pdf',
      original_filename: 'Site_Drawings_Rev2.pdf',
      file_size_bytes: 1048576,
    });
    expect(result.success).toBe(true);
  });

  it('fails when storage_bucket is missing', () => {
    const result = fileMetadataCreateSchema.safeParse({
      file_path: 'path/file.pdf',
      filename: 'file.pdf',
      original_filename: 'file.pdf',
      file_size_bytes: 100,
    });
    expect(result.success).toBe(false);
  });

  it('fails when file_size_bytes is negative', () => {
    const result = fileMetadataCreateSchema.safeParse({
      storage_bucket: 'docs',
      file_path: 'path/file.pdf',
      filename: 'file.pdf',
      original_filename: 'file.pdf',
      file_size_bytes: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional tags array', () => {
    const result = fileMetadataCreateSchema.safeParse({
      storage_bucket: 'docs',
      file_path: 'path/file.pdf',
      filename: 'file.pdf',
      original_filename: 'file.pdf',
      file_size_bytes: 500,
      tags: ['approved', 'structural'],
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// fileMetadataUpdateSchema
// ============================================================
describe('fileMetadataUpdateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = fileMetadataUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts is_deleted flag', () => {
    const result = fileMetadataUpdateSchema.safeParse({ is_deleted: true });
    expect(result.success).toBe(true);
  });

  it('accepts tags array update', () => {
    const result = fileMetadataUpdateSchema.safeParse({ tags: ['final', 'signed'] });
    expect(result.success).toBe(true);
  });

  it('fails when visibility is invalid', () => {
    const result = fileMetadataUpdateSchema.safeParse({ visibility: 'secret' });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// fileVersionSchema
// ============================================================
describe('fileVersionSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = fileVersionSchema.safeParse({
      storage_bucket: 'project-docs',
      file_path: 'projects/123/drawings_v2.pdf',
    });
    expect(result.success).toBe(true);
  });

  it('fails when storage_bucket is missing', () => {
    const result = fileVersionSchema.safeParse({ file_path: 'path/file.pdf' });
    expect(result.success).toBe(false);
  });

  it('fails when file_path is missing', () => {
    const result = fileVersionSchema.safeParse({ storage_bucket: 'docs' });
    expect(result.success).toBe(false);
  });

  it('accepts optional checksum_sha256 and change_note', () => {
    const result = fileVersionSchema.safeParse({
      storage_bucket: 'docs',
      file_path: 'path/file.pdf',
      checksum_sha256: 'abc123',
      change_note: 'Updated structural notes',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// fileShareCreateSchema
// ============================================================
describe('fileShareCreateSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    const result = fileShareCreateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid shared_with_user_id UUID', () => {
    const result = fileShareCreateSchema.safeParse({ shared_with_user_id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('fails when shared_with_user_id is not a valid UUID', () => {
    const result = fileShareCreateSchema.safeParse({ shared_with_user_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts expires_at field', () => {
    const result = fileShareCreateSchema.safeParse({
      shared_with_user_id: VALID_UUID,
      permission_level: 'view',
      expires_at: '2026-12-31T00:00:00Z',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// photoAssetCreateSchema
// ============================================================
describe('photoAssetCreateSchema', () => {
  it('accepts valid input with required field only', () => {
    const result = photoAssetCreateSchema.safeParse({ file_id: VALID_UUID });
    expect(result.success).toBe(true);
  });

  it('fails when file_id is missing', () => {
    const result = photoAssetCreateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('fails when file_id is not a valid UUID', () => {
    const result = photoAssetCreateSchema.safeParse({ file_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts optional location_point and category', () => {
    const result = photoAssetCreateSchema.safeParse({
      file_id: VALID_UUID,
      taken_at: '2026-02-26T10:00:00Z',
      location_point: { lat: 43.7, lng: -79.4 },
      category: 'progress',
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================
// photoAnnotationSchema
// ============================================================
describe('photoAnnotationSchema', () => {
  it('accepts valid annotation_json', () => {
    const result = photoAnnotationSchema.safeParse({
      annotation_json: { shapes: [], notes: 'Crack observed at column base.' },
    });
    expect(result.success).toBe(true);
  });

  it('fails when annotation_json is missing', () => {
    const result = photoAnnotationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts empty annotation_json object', () => {
    const result = photoAnnotationSchema.safeParse({ annotation_json: {} });
    expect(result.success).toBe(true);
  });
});
