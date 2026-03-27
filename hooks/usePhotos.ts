'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

import type { PaginatedResponse, PhotoAnnotation, PhotoAsset } from './useDocuments.types';

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
