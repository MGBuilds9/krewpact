'use client';

export interface FileFolder {
  id: string;
  project_id: string;
  parent_folder_id: string | null;
  folder_name: string;
  folder_path: string;
  visibility: 'internal' | 'client' | 'trade' | 'public' | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileMetadata {
  id: string;
  project_id: string;
  folder_id: string | null;
  storage_bucket: string;
  file_path: string;
  filename: string;
  original_filename: string;
  mime_type: string | null;
  file_size_bytes: number;
  checksum_sha256: string | null;
  version_no: number;
  visibility: 'internal' | 'client' | 'trade' | 'public' | null;
  tags: string[] | null;
  uploaded_by: string | null;
  source_system: string | null;
  source_identifier: string | null;
  is_deleted: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_no: number;
  storage_bucket: string;
  file_path: string;
  checksum_sha256: string | null;
  uploaded_by: string | null;
  change_note: string | null;
  created_at: string;
}

export interface FileShare {
  id: string;
  file_id: string;
  shared_by: string | null;
  shared_with_user_id: string | null;
  shared_with_portal_actor_id: string | null;
  permission_level: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface PhotoAsset {
  id: string;
  project_id: string;
  file_id: string;
  taken_at: string | null;
  location_point: Record<string, unknown> | null;
  category: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PhotoAnnotation {
  id: string;
  photo_id: string;
  annotation_json: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}
