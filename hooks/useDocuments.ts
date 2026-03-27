'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import { createBrowserClient } from '@/lib/supabase/client';

import type {
  FileFolder,
  FileMetadata,
  FileShare,
  FileVersion,
  PaginatedResponse,
} from './useDocuments.types';

export type {
  FileFolder,
  FileMetadata,
  FileShare,
  FileVersion,
  PaginatedResponse,
  PhotoAnnotation,
  PhotoAsset,
} from './useDocuments.types';
export {
  useCreatePhoto,
  useCreatePhotoAnnotation,
  usePhoto,
  usePhotoAnnotations,
  usePhotos,
} from './usePhotos';

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

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const STORAGE_BUCKET = 'project-files';

export function useUploadFile(projectId: string, folderId?: string, orgId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File exceeds 50 MB limit');
      }
      if (!orgId) {
        throw new Error('Organization ID is required for file upload');
      }
      const supabase = createBrowserClient();
      const ext = file.name.split('.').pop() ?? '';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext ? `.${ext}` : ''}`;
      const storagePath = `${orgId}/${projectId}/${folderId ?? 'root'}/${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, { contentType: file.type || undefined });
      if (uploadError) throw new Error(uploadError.message);
      return apiFetch<FileMetadata>(`/api/projects/${projectId}/files`, {
        method: 'POST',
        body: {
          storage_bucket: STORAGE_BUCKET,
          file_path: storagePath,
          filename: safeName,
          original_filename: file.name,
          mime_type: file.type || null,
          file_size_bytes: file.size,
          folder_id: folderId ?? null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files', projectId] });
    },
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: async ({
      storageBucket,
      filePath,
      originalFilename,
    }: {
      storageBucket: string;
      filePath: string;
      originalFilename: string;
    }) => {
      const supabase = createBrowserClient();
      const { data, error } = await supabase.storage
        .from(storageBucket)
        .createSignedUrl(filePath, 3600);
      if (error) throw new Error(error.message);
      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = originalFilename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
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
