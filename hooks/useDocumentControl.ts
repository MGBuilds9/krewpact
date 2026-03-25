'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type { Attachment, DistributionLog } from '@/lib/validators/document-control';

interface AttachmentWithUrl extends Attachment {
  downloadUrl: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

type EntityType = 'rfi' | 'submittal';

function attachmentsPath(entityType: EntityType, projectId: string, entityId: string): string {
  if (entityType === 'rfi') {
    return `/api/projects/${projectId}/rfis/${entityId}/attachments`;
  }
  return `/api/projects/${projectId}/submittals/${entityId}/attachments`;
}

// ============================================================
// Attachments
// ============================================================

export function useAttachments(entityType: EntityType, projectId: string, entityId: string) {
  return useQuery({
    queryKey: ['attachments', entityType, projectId, entityId],
    queryFn: () =>
      apiFetch<PaginatedResponse<AttachmentWithUrl>>(
        attachmentsPath(entityType, projectId, entityId),
      ),
    enabled: !!projectId && !!entityId,
    staleTime: 30_000,
  });
}

export function useUploadAttachment(entityType: EntityType, projectId: string, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return fetch(attachmentsPath(entityType, projectId, entityId), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      }).then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `Upload failed: ${res.status}`);
        }
        return res.json() as Promise<{ id: string; storagePath: string; publicUrl: string }>;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['attachments', entityType, projectId, entityId],
      });
    },
  });
}

export function useDeleteAttachment(entityType: EntityType, projectId: string, entityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: string) =>
      apiFetch(`${attachmentsPath(entityType, projectId, entityId)}?attachmentId=${attachmentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['attachments', entityType, projectId, entityId],
      });
    },
  });
}

// ============================================================
// Distribution log
// ============================================================

export function useDistributionLog(projectId: string, subId: string) {
  return useQuery({
    queryKey: ['distribution-log', projectId, subId],
    queryFn: () =>
      apiFetch<PaginatedResponse<DistributionLog>>(
        `/api/projects/${projectId}/submittals/${subId}/distribution`,
      ),
    enabled: !!projectId && !!subId,
    staleTime: 30_000,
  });
}

interface DistributionRecipient {
  user_id: string;
  email: string;
  name: string;
}

export function useCreateDistribution(projectId: string, subId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (recipients: DistributionRecipient[]) =>
      apiFetch<PaginatedResponse<DistributionLog>>(
        `/api/projects/${projectId}/submittals/${subId}/distribution`,
        { method: 'POST', body: { recipients } },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-log', projectId, subId] });
    },
  });
}
