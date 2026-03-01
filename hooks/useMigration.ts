'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export interface MigrationBatch {
  id: string;
  source_system: string;
  batch_name: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'dead_letter';
  summary: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MigrationConflict {
  id: string;
  batch_id: string;
  record_id: string;
  entity_type: string;
  conflict_type: string;
  source_payload: Record<string, unknown>;
  target_payload: Record<string, unknown> | null;
  resolution_status: 'open' | 'resolved' | 'skipped';
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  hasMore: boolean;
}

export function useMigrationBatches(params?: { status?: string; source_system?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['migration-batches', params],
    queryFn: () => apiFetch<PaginatedResponse<MigrationBatch>>('/api/migration/batches', { params }),
    staleTime: 30_000,
  });
}

export function useMigrationBatch(id: string) {
  return useQuery({
    queryKey: ['migration-batch', id],
    queryFn: () => apiFetch<MigrationBatch>(`/api/migration/batches/${id}`),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCreateMigrationBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<MigrationBatch>('/api/migration/batches', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-batches'] });
    },
  });
}

export function useUpdateMigrationBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      apiFetch<MigrationBatch>(`/api/migration/batches/${id}`, { method: 'PATCH', body: data }),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['migration-batches'] });
      queryClient.invalidateQueries({ queryKey: ['migration-batch', vars.id] });
    },
  });
}

export function useMigrationConflicts(batchId: string, params?: { resolution_status?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['migration-conflicts', batchId, params],
    queryFn: () => apiFetch<PaginatedResponse<MigrationConflict>>(`/api/migration/batches/${batchId}/conflicts`, { params }),
    enabled: !!batchId,
    staleTime: 30_000,
  });
}

export function useResolveMigrationConflict(batchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conflictId, ...data }: { conflictId: string } & Record<string, unknown>) =>
      apiFetch<MigrationConflict>(`/api/migration/batches/${batchId}/conflicts/${conflictId}`, { method: 'PATCH', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['migration-conflicts', batchId] });
    },
  });
}
