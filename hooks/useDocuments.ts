'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

// ============================================================
// Interfaces
// ============================================================

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

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

// ============================================================
// Folders
// ============================================================

export function useFolders(projectId: string) {
  return useQuery({
    queryKey: ['folders', projectId],
    queryFn: () => apiFetch<PaginatedResponse<FileFolder>>(`/api/projects/${projectId}/folders`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useCreateFolder(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FileFolder>) =>
      apiFetch<FileFolder>(`/api/projects/${projectId}/folders`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', projectId] });
    },
  });
}

export function useUpdateFolder(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ folderId, ...data }: Partial<FileFolder> & { folderId: string }) =>
      apiFetch<FileFolder>(`/api/projects/${projectId}/folders/${folderId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', projectId] });
    },
  });
}

export function useDeleteFolder(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (folderId: string) =>
      apiFetch(`/api/projects/${projectId}/folders/${folderId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders', projectId] });
    },
  });
}

// ============================================================
// Files
// ============================================================

export function useFiles(projectId: string, folderId?: string) {
  return useQuery({
    queryKey: ['files', projectId, folderId],
    queryFn: () =>
      apiFetch<PaginatedResponse<FileMetadata>>(`/api/projects/${projectId}/files`, {
        params: { folder_id: folderId },
      }),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useFile(projectId: string, fileId: string) {
  return useQuery({
    queryKey: ['file', projectId, fileId],
    queryFn: () => apiFetch<FileMetadata>(`/api/projects/${projectId}/files/${fileId}`),
    enabled: !!projectId && !!fileId,
    staleTime: 30_000,
  });
}

export function useCreateFile(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FileMetadata>) =>
      apiFetch<FileMetadata>(`/api/projects/${projectId}/files`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', projectId] });
    },
  });
}

export function useUpdateFile(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, ...data }: Partial<FileMetadata> & { fileId: string }) =>
      apiFetch<FileMetadata>(`/api/projects/${projectId}/files/${fileId}`, {
        method: 'PATCH',
        body: data,
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['file', projectId, variables.fileId] });
    },
  });
}

export function useDeleteFile(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fileId: string) =>
      apiFetch(`/api/projects/${projectId}/files/${fileId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', projectId] });
    },
  });
}

// ============================================================
// Versions
// ============================================================

export function useFileVersions(projectId: string, fileId: string) {
  return useQuery({
    queryKey: ['file-versions', projectId, fileId],
    queryFn: () =>
      apiFetch<PaginatedResponse<FileVersion>>(
        `/api/projects/${projectId}/files/${fileId}/versions`,
      ),
    enabled: !!projectId && !!fileId,
    staleTime: 30_000,
  });
}

export function useCreateFileVersion(projectId: string, fileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FileVersion>) =>
      apiFetch<FileVersion>(`/api/projects/${projectId}/files/${fileId}/versions`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-versions', projectId, fileId] });
    },
  });
}

// ============================================================
// Shares
// ============================================================

export function useFileShares(projectId: string, fileId: string) {
  return useQuery({
    queryKey: ['file-shares', projectId, fileId],
    queryFn: () =>
      apiFetch<PaginatedResponse<FileShare>>(`/api/projects/${projectId}/files/${fileId}/share`),
    enabled: !!projectId && !!fileId,
    staleTime: 30_000,
  });
}

export function useCreateFileShare(projectId: string, fileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<FileShare>) =>
      apiFetch<FileShare>(`/api/projects/${projectId}/files/${fileId}/share`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-shares', projectId, fileId] });
    },
  });
}

// ============================================================
// Photos
// ============================================================

export function usePhotos(projectId: string) {
  return useQuery({
    queryKey: ['photos', projectId],
    queryFn: () => apiFetch<PaginatedResponse<PhotoAsset>>(`/api/projects/${projectId}/photos`),
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function usePhoto(projectId: string, photoId: string) {
  return useQuery({
    queryKey: ['photo', projectId, photoId],
    queryFn: () => apiFetch<PhotoAsset>(`/api/projects/${projectId}/photos/${photoId}`),
    enabled: !!projectId && !!photoId,
    staleTime: 30_000,
  });
}

export function useCreatePhoto(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PhotoAsset>) =>
      apiFetch<PhotoAsset>(`/api/projects/${projectId}/photos`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', projectId] });
    },
  });
}

// ============================================================
// Annotations
// ============================================================

export function usePhotoAnnotations(projectId: string, photoId: string) {
  return useQuery({
    queryKey: ['photo-annotations', projectId, photoId],
    queryFn: () =>
      apiFetch<PaginatedResponse<PhotoAnnotation>>(
        `/api/projects/${projectId}/photos/${photoId}/annotations`,
      ),
    enabled: !!projectId && !!photoId,
    staleTime: 30_000,
  });
}

export function useCreatePhotoAnnotation(projectId: string, photoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PhotoAnnotation>) =>
      apiFetch<PhotoAnnotation>(`/api/projects/${projectId}/photos/${photoId}/annotations`, {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photo-annotations', projectId, photoId] });
    },
  });
}
